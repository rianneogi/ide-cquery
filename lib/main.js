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
    let params = AutoLanguageClient.prototype.getInitializeParams(projectPath, process);
    params.initializationOptions = {
      projectRoot: `${projectPath}`,
      cacheDirectory: `${projectPath}cquery_cache`
    };
    return params;
  }

  startServerProcess (projectPath) {
    this.projectPath = projectPath

    const command = atom.config.get('ide-cquery.cqueryPath')
    const args = ['--log-file', 'cquerylog.txt', '--language-server']
    const options = {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'ignore']
    }

    this.logger.debug(`Starting ${command} ${args.join(' ')}`)
    const serverProcess = spawn(command, args, options)

    serverProcess.on('exit', (code, signal) => atom.notifications.addInfo('Cquery terminated', {dismissable: true, description:`exit: code ${code} signal ${signal}`}))
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
    serverProcess.setEncoding('utf8')
    serverProcess.stderr.on('data', (data) => {
      atom.notifications.addError(data.toString(), {dismissable:true, description:''})
    }
    )

    return (serverProcess)
  }
}

module.exports = new CqueryLanguageClient()
