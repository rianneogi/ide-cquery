const fs = require('fs')
const path = require('path')

const { watchPath } = require('atom')
const { spawn } = require('child_process')
const { AutoLanguageClient, Convert } = require('atom-languageclient')
const shellParse = require('shell-quote').parse

class CqueryLanguageClient extends AutoLanguageClient {
  getGrammarScopes () { return [ 'source.c', 'source.cpp' ] }
  getLanguageName () { return 'C++' }
  getServerName () { return 'cquery' }
  getConnectionType() { return 'stdio' }; // ipc, socket, stdio

  getInitializeParams (projectPath, process) {
    // Fetch and normalize cache directory.
    let cacheDirectory = atom.config.get('ide-cquery.cacheDirectory');
    let projectPathWithoutTrailing = projectPath;
    if (projectPath.endsWith('/') || projectPath.endsWith('\\'))
      projectPathWithoutTrailing = projectPath.substr(0, projectPath.length - 1);
    cacheDirectory = cacheDirectory.replace(/\$projectPath/g, projectPathWithoutTrailing);
    cacheDirectory = cacheDirectory.replace(/\\/g, '/');
    if (!cacheDirectory.endsWith('/'))
      cacheDirectory += '/';

    // Add additional initialization options.
    let params = AutoLanguageClient.prototype.getInitializeParams(projectPath, process);
    params.initializationOptions = {
      projectRoot: `${projectPath}`,
      cacheDirectory: cacheDirectory,
      client:
      {
        snippetSupport: atom.config.get("ide-cquery.enableSnippetInsertion"),
      },
      includeCompletionWhitelistLiteralEnding: [".h", ".hpp"],
      extraClangArguments: shellParse(atom.config.get("ide-cquery.extraClangArguments").join(" ")),
      index:
      {
        comments: atom.config.get("ide-cquery.commentParsing")
      },
      completion:
      {
        detailedLabel: atom.config.get("ide-cquery.detailedCompletionLabel"),
        filterAndSort: false
      }
    };
    return params;
  }

  startServerProcess (projectPath) {
    this.projectPath = projectPath

    this.semanticHighlights = {}
    this.inactiveRegions = {}
    this.activeEditor = null
    this.semanticMarkers = []
    this.inactiveRegionMarkers = []

    atom.config.set('core.debugLSP', true)

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
        let title = `cquery running ${progress.activeThreads} thread${progress.activeThreads > 1 ? 's' : ''}`
        if(progress.indexRequestCount > 0) {
          title += ` - ${progress.indexRequestCount} file${progress.indexRequestCount > 1 ? 's' : ''} to index`
        }
        if(!this.cqueryProgressSignal) {
          this.cqueryProgressSignal = this.busySignalService.reportBusy(title)
        } else {
          this.cqueryProgressSignal.setTitle(title)
        }
      } else if(this.cqueryProgressSignal) {
        this.cqueryProgressSignal.dispose();
        this.cqueryProgressSignal = null;
      }
    });

    connection.onCustom('$cquery/publishSemanticHighlighting', (_semanticHighlight) => {
      const uri = Convert.uriToPath(_semanticHighlight.uri);
      this.semanticHighlights[uri] = _semanticHighlight.inactiveRegions;
      if(this.activeEditor.getURI() == uri) {
        this.applySemanticHighlighting();
      }
    });

    connection.onCustom('$cquery/setInactiveRegions', (region) => {
      const uri = Convert.uriToPath(region.uri);
      this.inactiveRegions[uri] = region.inactiveRegions;
      if(this.activeEditor.getURI() == uri) {
        this.applyInactiveRegions();
      }
    })
  }

  postInitialization(server) {
    server.disposable.add(atom.project.onDidChangeFiles(events => {
      if(events.some((event) => event.path.endsWith('.cquery') || event.path.endsWith('compile_commands.json'))) {
        server.connection.didChangeConfiguration({});
      }
    }));

    server.disposable.add(atom.workspace.observeActiveTextEditor((editor) => {
      this.activeEditor = editor
      this.applySemanticHighlighting();
      this.applyInactiveRegions();
    }));
  }

  applySemanticHighlighting() {
    if(!this.activeEditor || !this.semanticHighlights[this.activeEditor.getURI()]) {
      return;
    }

    this.semanticMarkers.splice(0).forEach((m) => m.destroy());
    for(let h of this.semanticHighlights[this.activeEditor.getURI()]) {
      this.semanticMarkers.append(h.ranges.map((range) => this.activeEditor.markBufferRange(Convert.lsRangeToAtomRange(range))));
      for(let m of this.markers) {
        this.activeEditor.decorateMarker(m, {
          type: 'text',
          class: 'cquery-semantic-highlight'
        });
      }
    }
  }

  applyInactiveRegions() {
    if(!this.activeEditor || !this.inactiveRegions[this.activeEditor.getURI()]) {
      return;
    }

    this.inactiveRegionMarkers.splice(0).forEach((m) => m.destroy());
    this.inactiveRegionMarkers = this.inactiveRegions[this.activeEditor.getURI()]
      .map((range) => this.activeEditor.markBufferRange(Convert.lsRangeToAtomRange(range)));
    this.inactiveRegionMarkers .forEach((m) => {
      this.activeEditor.decorateMarker(m, {
        type: 'text',
        // Added cquery-inactive-region for debugging purposes (e.g. "why is this syntax--comment???")
        class: 'cquery-inactive-region syntax--comment'
      });
    });
  }
}

module.exports = new CqueryLanguageClient()
