const fs = require('fs')
const path = require('path')

const { spawn } = require('child_process')
const { AutoLanguageClient, Convert } = require('atom-languageclient')
const shellParse = require('shell-quote').parse

const config = require('./config')

const SymbolKind = {
  // lsSymbolKind
  Unknown : 0,
  // File = 1,
  // Module = 2,
  Namespace : 3,
  // Package,

  Class : 5,
  Method : 6,
  Property : 7,
  Field : 8,
  Constructor : 9,

  Enum : 10,
  Interface : 11,
  Function : 12,
  Variable : 13,
  Constant : 14,

  // String = 15,
  // Number,
  // Boolean,
  // Array,
  // Object,

  // Key = 20,
  // Null,
  EnumMember : 22,
  Struct : 23,
  // Event,

  Operator : 25,
  TypeParameter : 26,

  // cquery extensions
  TypeAlias : 252,
  Parameter : 253,
  StaticMethod : 254,
  Macro : 255
}

const StorageClass = {
  Static : 3
}


class CqueryLanguageClient extends AutoLanguageClient {
  constructor () {
    super();
    this.config = config;
    this.markers = []
    // this.markerFiles = []
  }
  getGrammarScopes () { return [ 'source.c', 'source.cpp', 'c', 'cpp' ] }
  getLanguageName () { return 'C++' }
  getServerName () { return 'cquery' }
  getConnectionType() { return 'stdio' }; // ipc, socket, stdio

  getInitializationOptions (projectPath) {
    let cacheDirectory = atom.config.get('ide-cquery.initializationOptions.cacheDirectory');
    let projectPathWithoutTrailing = projectPath;
    if (projectPath.endsWith('/') || projectPath.endsWith('\\'))
      projectPathWithoutTrailing = projectPath.substr(0, projectPath.length - 1);
    cacheDirectory = cacheDirectory.replace(/\$projectPath/g, projectPathWithoutTrailing);
    cacheDirectory = cacheDirectory.replace(/\\/g, '/');
    if (!cacheDirectory.endsWith('/'))
      cacheDirectory += '/';
    let options = atom.config.get("ide-cquery.initializationOptions");
    options["projectRoot"] = `${projectPath}`
    options["completion"]["filterAndSort"] = false
    options["cacheDirectory"] = cacheDirectory
    options["discoverSystemIncludes"] = atom.config.get('ide-cquery.discoverSystemIncludes');
    return options;
  }

  getInitializeParams (projectPath, process) {
    // Add additional initialization options.
    let params = AutoLanguageClient.prototype.getInitializeParams(projectPath, process);
    params.initializationOptions = this.getInitializationOptions(projectPath);
    return params;
  }

  startServerProcess (projectPath) {
    this.projectPath = projectPath

    const command = atom.config.get('ide-cquery.cqueryPath')
    const doLogging = atom.config.get('ide-cquery.logging')
    var args
    if(doLogging)
    {
      args = ['--log-file', atom.config.get('ide-cquery.logFile'), '--language-server']
    }
    else {
      args = ['--language-server']
    }
    const options = {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe']
    }

    this.logger.debug(`Starting ${command} ${args.join(' ')}`)

    return spawn(command, args, options)
  }

  deactivate() {
    return Promise.race([super.deactivate(), this.createTimeoutPromise(2000)]);
  }

  createTimeoutPromise(milliseconds) {
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        clearTimeout(timeout);
        this.logger.error(
          `Server failed to shutdown in ${milliseconds}ms, forcing termination`
        );
        resolve();
      }, milliseconds);
    });
  }

  preInitialization(connection) {
    connection.onCustom('$cquery/progress', (progress) => {
      if(progress.activeThreads > 0 && this.busySignalService) {
        if(!this.cqueryProgressSignal) {
          this.cqueryProgressSignal = this.busySignalService.reportBusy(`cquery running`)
        }
        this.cqueryProgressSignal.setTitle(`cquery running ${progress.activeThreads} thread(s)`)
      } else if(this.cqueryProgressSignal) {
        this.cqueryProgressSignal.dispose();
        this.cqueryProgressSignal = null
      }
    });
    
    const doInactiveRegions = atom.config.get('ide-cquery.enableSetInactiveRegions')
    if(doInactiveRegions)
    {
      connection.onCustom('$cquery/setInactiveRegions', (data) => {
        let options = {
          type: "text",
          class: "cquery--disabled"
        }

        let editor = atom.workspace.getActiveTextEditor();
        for(let i = 0;i<atom.workspace.getTextEditors().length;i++)
        {
          if(atom.workspace.getTextEditors()[i].getPath()==Convert.uriToPath(data.uri))
          {
            editor = atom.workspace.getTextEditors()[i]
            break
          }
        }

        for(let i = 0;i<data.inactiveRegions.length;i++)
        {
          let marker = editor.markBufferRange(Convert.lsRangeToAtomRange(data.inactiveRegions[i]))
          let decoration = editor.decorateMarker(marker, options)
        }
      })
    }
    
    const doSemanticHighlight = atom.config.get('ide-cquery.enableSemanticHighlighting')
    if(doSemanticHighlight)
    {
      connection.onCustom('$cquery/publishSemanticHighlighting', (data) => {        
        var options = {
          type: "text",
          class: "cquery--disabled"
        }

        let editor = atom.workspace.getActiveTextEditor();
        for(let i = 0;i<atom.workspace.getTextEditors().length;i++)
        {
          if(atom.workspace.getTextEditors()[i].getPath()==Convert.uriToPath(data.uri))
          {
            editor = atom.workspace.getTextEditors()[i]
            break
          }
        }
        
        // Delete all existing markers
        for(let i = 0;i<this.markers.length;i++)
        {
          // if(this.markerFiles[i]==editor.getPath())
          // {
            this.markers[i].destroy()
            // this.logger.info(`Deleting ${i}`)
            // this.markers.splice(i, 1)
            // this.markerFiles.splice(i,1)
          // }
        }
        this.markers.length = 0
        // this.markers = []
        
        for(let i = 0;i<data.symbols.length;i++)
        {
          if(data.symbols[i].kind==SymbolKind.Class || data.symbols[i].kind==SymbolKind.Struct || data.symbols[i].kind==SymbolKind.Constructor)
          {
            options = {
              type: "text",
              class: "cquery--type"
            }
          }
          else if(data.symbols[i].kind==SymbolKind.Enum)
          {
            options = {
              type: "text",
              class: "cquery--enum"
            }
          }
          else if(data.symbols[i].kind==SymbolKind.TypeAlias)
          {
            options = {
              type: "text",
              class: "cquery--typeAlias"
            }
          }
          else if(data.symbols[i].kind==SymbolKind.TypeParameter)
          {
            options = {
              type: "text",
              class: "cquery--templateParameter"
            }
          }
          else if(data.symbols[i].kind==SymbolKind.Function)
          {
            options = {
              type: "text",
              class: "cquery--freeStandingFunction"
            }
          }
          else if(data.symbols[i].kind==SymbolKind.Method)
          {
            options = {
              type: "text",
              class: "cquery--memberFunction"
            }
          }
          else if(data.symbols[i].kind==SymbolKind.StaticMethod)
          {
            options = {
              type: "text",
              class: "cquery--staticMemberFunction"
            }
          }
          else if(data.symbols[i].kind==SymbolKind.Variable)
          {
            if (data.symbols[i].parentKind == SymbolKind.Function ||
              data.symbols[i].parentKind == SymbolKind.Method ||
              data.symbols[i].parentKind == SymbolKind.Constructor)
            {
              options = {
                type: "text",
                class: "cquery--freeStandingVariable"
              }
            }
            else
            {
              options = {
                type: "text",
                class: "cquery--globalVariable"
              }
            }
          }
          else if(data.symbols[i].kind==SymbolKind.Field)
          {
            if(data.symbols[i].storage==StorageClass.Static)
            {
              options = {
                type: "text",
                class: "cquery--staticMemberVariable"
              }
            }
            else
            {
              options = {
                type: "text",
                class: "cquery--memberVariable"
              }
            }
          }
          else if(data.symbols[i].kind==SymbolKind.Parameter)
          {
            options = {
              type: "text",
              class: "cquery--parameter"
            }
          }
          else if(data.symbols[i].kind==SymbolKind.EnumMember)
          {
            options = {
              type: "text",
              class: "cquery--enumConstant"
            }
          }
          else if(data.symbols[i].kind==SymbolKind.Namespace)
          {
            options = {
              type: "text",
              class: "cquery--namespace"
            }
          }
          else if(data.symbols[i].kind==SymbolKind.Macro)
          {
            options = {
              type: "text",
              class: "cquery--macro"
            }
          }
          
          for(let j = 0;j<data.symbols[i].ranges.length;j++)
          {
            let marker = editor.markBufferRange(
              Convert.lsRangeToAtomRange(data.symbols[i].ranges[j]), 
              {invalidate: "touch"}
            )
            let decoration = editor.decorateMarker(marker, options)

            this.markers.push(marker)
            // this.markerFiles.push(editor.getPath())            
          }
        }
      })
    }
  }

  postInitialization(server) {
    server.disposable.add(atom.project.onDidChangeFiles(events => {
      if(events.some((event) => {
        let paths = atom.project.relativizePath(event.path);
        return !path.relative(paths[0], server.projectPath) && (paths[1] == 'compile_commands.json' || paths[1].endsWith('.cquery'));
      })) {
        server.connection.didChangeConfiguration({});
      }
    }));

    server.disposable.add(atom.workspace.onDidChangeActiveTextEditor(editor => {
      if(!editor || !editor.getPath()) {
        return;
      }
      let paths = atom.project.relativizePath(editor.getPath());
      if(paths[0] && !path.relative(paths[0], server.projectPath)) {
        server.connection.sendCustomRequest('$cquery/textDocumentDidView', {textDocumentUri: Convert.pathToUri(editor.getPath())});
        
        editor.onDidStopChanging(() => {
          server.connection.sendCustomRequest('$cquery/textDocumentDidView', {textDocumentUri: Convert.pathToUri(editor.getPath())});
        })
      }
      
    }));

    let editor = atom.workspace.getActiveTextEditor();
    if(editor) {
      let paths = atom.project.relativizePath(editor.getPath());
      if(!path.relative(paths[0], server.projectPath)) {
        server.connection.sendCustomRequest('$cquery/textDocumentDidView', {textDocumentUri: Convert.pathToUri(editor.getPath())});
        
        editor.onDidStopChanging(() => {
          server.connection.sendCustomRequest('$cquery/textDocumentDidView', {textDocumentUri: Convert.pathToUri(editor.getPath())});
        })
      }
    }
  }
}

module.exports = new CqueryLanguageClient()
