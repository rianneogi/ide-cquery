const fs = require('fs')
const path = require('path')

const { spawn } = require('child_process')
const { AutoLanguageClient, Convert } = require('atom-languageclient')
const shellParse = require('shell-quote').parse

const config = require('./config')

class CqueryLanguageClient extends AutoLanguageClient {
  constructor () {
    super();
    this.config = config;
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
    const doLogging = atom.config.get('ide-cquery.enableLogging')
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
        this.cqueryProgressSignal = null;
      }
    });
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
      let paths = atom.project.relativizePath(editor.getPath());
      if(!path.relative(paths[0], server.projectPath)) {
        server.connection.sendCustomRequest('$cquery/textDocumentDidView', {textDocumentUri: Convert.pathToUri(editor.getPath())});
      }
    }));

    let editor = atom.workspace.getActiveTextEditor();
    if(editor) {
      let paths = atom.project.relativizePath(editor.getPath());
      if(!path.relative(paths[0], server.projectPath)) {
        server.connection.sendCustomRequest('$cquery/textDocumentDidView', {textDocumentUri: Convert.pathToUri(editor.getPath())});
      }
    }
  }
}

module.exports = new CqueryLanguageClient()
