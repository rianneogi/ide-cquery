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

    atom.config.set('core.debugLSP', true)

    const command = atom.config.get('ide-cquery.cqueryPath')
    const args = ['--log-file', 'cquerylog.txt', '--language-server']
    const options = {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe']
    }

    this.logger.debug(`Starting ${command} ${args.join(' ')}`)
    const serverProcess = spawn(command, args, options)
    // atom.notifications.addInfo('Starting cquery...',{dismissable:true, description:''})

    serverProcess.on('exit', (code, signal) => atom.notifications.addInfo('Cquery terminated', {dismissable: true, description:`exit: code ${code} signal ${signal}`}))

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
    // serverProcess.stdin.setEncoding('utf8')
    // serverProcess.stdin.on('data', (data) => {
    //   atom.notifications.addError(data.toString(), {dismissable:true, description:''})
    // })

    ////Pipe Debug Info to files
    // var fs = require("fs")
    // var file = fs.createWriteStream(`${projectPath}stdin.txt`)
    // serverProcess.stdin.pipe(file)
    //
    // var file = fs.createWriteStream(`${projectPath}stdout.txt`)
    // serverProcess.stdout.pipe(file)
    //
    // var file = fs.createWriteStream(`${projectPath}stderr.txt`)
    // serverProcess.stderr.pipe(file)

    return (serverProcess)
  }
}

module.exports = new CqueryLanguageClient()
