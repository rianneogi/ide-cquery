const fs = require('fs')
const path = require('path')

const { spawn } = require('child_process')
const { AutoLanguageClient } = require('atom-languageclient')
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
}

module.exports = new CqueryLanguageClient()
