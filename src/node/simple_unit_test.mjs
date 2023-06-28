/**
 * Executes a list of test files
 */
import { glob } from 'glob'
import { spawn} from 'node:child_process'

let filesGlobs = process.argv.slice(2)


if (filesGlobs.length === 0) {
  filesGlobs = [ '*.test.mjs']
}

let testFiles = []
for (let i = 0; i < filesGlobs.length; i++) {
  let fileGlob = filesGlobs[i]
  let files = await glob(fileGlob)
  testFiles.push(...files)
}

for (let i = 0; i < testFiles.length; i++) {
  let fileName = testFiles[i]
  let result
  let childStdErr
  try {
    [result, childStdErr] = await runCommand('node', [ fileName])
  } catch(e) {
    console.warn(`${fileName} had an error`)
    console.log(e)
  }

  if (typeof result === 'string') {
    console.warn(`${fileName} ended by signal '${result}'`)
  } else {
    if (result !==0) {
      console.warn(`\n${fileName} ended with exit code ${result}\n`)
      process.stderr.write(childStdErr)
      console.log('')
    }
  }
}

function runCommand(command, args) {
  return new Promise( (resolve, reject) => {
    let childProcess = spawn(command, args)
    let childStdErr = ''
    childProcess.stdout.on('data', (data) => {
      process.stdout.write(data)
    })

    childProcess.stderr.on('data', (data) => {
      childStdErr += data
    })

    childProcess.on('error', (err) => {
      reject(err, childStdErr)
    })
    childProcess.on('exit', (exitCodeOrSignal) => {
      resolve([exitCodeOrSignal, childStdErr])
    })
  })
}