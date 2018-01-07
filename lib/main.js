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

  getInitializeParams (projectPath, process) {
    let params = AutoLanguageClient.prototype.getInitializeParams(projectPath, process);
    params.initializationOptions = {
      cacheDirectory: `${projectPath}cquery_cache`
    };
    return params;
  }

  startServerProcess (projectPath) {
    this.projectPath = projectPath

    const command = atom.config.get('ide-cquery.cqueryPath')
    const args = ['--log-file', 'cquerylog.txt', '--language-server']
    const options = {
      // Clangd uses stderr for debug logging, so we have to ignore it.
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'ignore']
    }

    this.logger.debug(`Starting ${command} ${args.join(' ')}`)
    const serverProcess = spawn(command, args, options)

    serverProcess.on('exit', exit => atom.notifications.addInfo('exited', {dismissable: true, description:'(exit.signal).toString()'}))
    serverProcess.on('message', message => atom.notifications.addInfo('msg', {dismissable: true, description:message.message}))
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

  preInitialization (connection) {
    // const didOpenTextDocument = connection.didOpenTextDocument.bind(connection)
    // connection.didOpenTextDocument = (params) => {
    //   // TODO: Resolve the appropriate language ID (based on extension perhaps).
    //   params.textDocument.languageId = 'cpp'
    //
    //   // Append non-standard 'metadata' to the 'textDocument/didOpen' payload, which currently
    //   // contains compilation flags needed by Clangd.
    //   params = this.appendClangMetadata(params)
    //
    //   didOpenTextDocument(params)
    // }
  }

  // appendClangMetadata (params) {
  //   const flags = this.findCompilationFlags()
  //   if (flags) {
  //     // This non-standard addition is not documented anywhere (yet), but a test can be seen at
  //     // http://llvm.org/svn/llvm-project/clang-tools-extra/trunk/test/clangd/extra-flags.test
  //     params.metadata = { extraFlags: flags }
  //   }
  //
  //   return params
  // }
  //
  // findCompilationFlags () {
  //   // Additional details of the '.clang_complete' file can be found at
  //   // https://github.com/Rip-Rip/clang_complete
  //   const candidatePath = path.join(this.projectPath, '.clang_complete')
  //   if (fs.existsSync(candidatePath)) {
  //     return this.parseClangCompleteFile(candidatePath)
  //   }
  //
  //   // TODO: Add support for additional file formats.
  //
  //   return null
  // }
  //
  // parseClangCompleteFile (filePath) {
  //   const rawData = fs.readFileSync(filePath)
  //   if (rawData) {
  //     const lines = rawData.toString().replace(/\r\n/, '\n').split('\n')
  //     return lines.filter(line => line.trim().length > 0)
  //   }
  // }
}

module.exports = new CqueryLanguageClient()
