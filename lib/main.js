const fs = require('fs')
const path = require('path')

const { spawn } = require('child_process')
const { AutoLanguageClient } = require('atom-languageclient')

class CqueryLanguageClient extends AutoLanguageClient {
  constructor() {
    super();
  }

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
      cacheDirectory: cacheDirectory
    };
    return params;
  }

  startServerProcess (projectPath) {
    this.projectPath = projectPath

    const command = atom.config.get('ide-cquery.cqueryPath')
    const args = ['--log-file', 'cquerylog.txt', '--language-server']
    const options = {
      // cquery uses stderr for debug logging, so we have to ignore it.
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'ignore']
    }

    this.logger.debug(`Starting ${command} ${args.join(' ')}`)
    const serverProcess = spawn(command, args, options)

    serverProcess.on('exit', exit => atom.notifications.addInfo('exited', {dismissable: true, description:'cquery process has been terminated'}))
    // serverProcess.on('message', message => atom.notifications.addInfo('msg', {dismissable: true, description:message.message}))
    serverProcess.on('error', error => {
      if (error.code === 'ENOENT') {
        atom.notifications.addError(`Unable to start ${this.getServerName()} language server`, {
          dismissable: true,
          description: '' +
            `Tried to spawn process using executable **${error.path}**, which does not exist. ` +
            `Ensure you have correctly configured the path to cquery in the package settings.`
        })
      }
    })

    return (serverProcess)
  }
}

module.exports = new CqueryLanguageClient()
