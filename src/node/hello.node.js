
// var http = require('http')
//
// http.createServer(function (req, res) {
//   res.writeHead(200, {'Content-Type': 'text/html'});
//   res.end('Hello World!');
// }).listen(8080);

import {exec }from 'node:child_process'
import { PangoMeasurer } from './PangoMeasurer.mjs'

const repeater  = '../python/text-measurer.py'

const someData = {
  text: 'Quejada',
  fontFamily: 'FreeSerif',
  fontSize: 12
}

let jsonString = JSON.stringify(someData)

let child = exec(repeater, (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`)
    return
  }
  console.log(`Got some data from python`)
  let data = JSON.parse(stdout)
  console.log(data)

  if (stderr !== '') {
    console.log(`Stderr: ${stderr}`)
  }

})

child.stdin.write(jsonString)
child.stdin.end()


