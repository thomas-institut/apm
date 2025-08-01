// noinspection ES6PreferShortImport

import express from 'express'
import { PangoMeasurerNodeGTK } from './PangoMeasurerNodeGTK.mjs'
import GI from 'node-gtk'
import { processInputJson } from './processInputJson.mjs'
import bodyParser from 'body-parser'
import { spawn } from 'node:child_process'
import process, { hrtime } from 'node:process'
import { readFile, unlink, stat } from 'fs/promises'
import YAML from 'yaml'

const Pango  = GI.require('Pango')

const usage = `Usage: node typesetting-server.mjs  /absolute/path/to/config.yaml`;

if (process.argv.length < 3) {
  console.log(usage);
  process.exit(1);
}

console.log(`Config file is ${process.argv[2]}`);

const config = await readConfig(process.argv[2])

if (config.typesettingService === undefined) {
  config.typesettingService = {}
}

const PORT = config['typesettingService']['port'] ?? 4711;
const PdfRenderer = config['pdfRenderer'] ?? '/usr/bin/python3 /opt/apm/python/pdf-renderer.py';
const TmpDir = config['typesettingTmpDir'] ?? '/var/apm/typesetting-tmp';


let typesettingServer = express();
typesettingServer.use(bodyParser.json({ limit: '50mb'}));

typesettingServer.get('/api/measure', (req, res) => {

  let text = req.query.text ?? 'Sample string';
  let font = req.query.font ?? 'Arial';
  let size = parseInt(req.query.size ?? '12');


  let measurer =  new PangoMeasurerNodeGTK()
  const scale= 1000

  let measurements = measurer.measureText(text, `${font} ${scale*size}`)

  res.json({
    text: text,
    font: font,
    fontSize: size,
    measurements: {
      width: measurements.logical.width / (Pango.SCALE*scale),
      height: measurements.logical.height / (Pango.SCALE*scale)
    }
  });
});


typesettingServer.post('/api/typeset', async (req, res) => {
  let data = req.body;
  if (data===undefined) {
    logIt(`Error typesetting: No JSON in input`);
    res.json({error: true, errorMsg: "No JSON in input"});
  }
  let inputId = data.id ??  getRandomId();
  logIt(`Typeset ${inputId}: Start`);

  let outputType = req.query.output ?? 'pdf';
  let processingTime = 0;



  let outputData = await processInputJson(data);
  if (outputData.error) {
    logIt(`Typeset ${inputId}: Error typesetting: ${outputData.errorMsg}`);
  } else {
    processingTime += Math.round(outputData.stats.processingTime);
    logIt(`Typeset ${inputId}: Typesetting done in ${processingTime} ms`);
  }
  if (outputType === 'json') {
    logIt(`Typeset ${inputId}: Sending JSON out`);
    res.json(outputData);
    return;
  }

  // go on with PDF!

  let start = hrtime.bigint();
  let pdfRendererInput = JSON.stringify(outputData.output);


  let pdfRendererCmdParts = PdfRenderer.split(' ');
  const pdfRendererOutputFileName = `${TmpDir}/${inputId}.pdf`;

  const pdfRendererProcess = spawn(
    pdfRendererCmdParts[0],
    [...pdfRendererCmdParts.slice(1), pdfRendererOutputFileName]
  );
  pdfRendererProcess.stdin.write(pdfRendererInput);
  pdfRendererProcess.stdin.end();


  pdfRendererProcess.stderr.on('data', (data) => {
    logLines(data, inputId, "PdfRenderer STDERR");
  });

  pdfRendererProcess.stdout.on('data', (data) => {
    logLines(data, inputId, "PdfRenderer STDOUT");
  });

  pdfRendererProcess.on('close', async (code) =>{
    if (code !== 0) {
      logIt(`Typeset ${inputId}: ERROR - PdfRenderer exited with code ${code}`);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error: PdfRenderer returned with error");
      }
    } else {
      let end = hrtime.bigint();
      let durationInMs = Math.round(Number(end-start)/1000000);
      const fileStats = await stat(pdfRendererOutputFileName);
      const fileSizeInKB = Math.round(fileStats.size / 1024);

      logIt(`Typeset ${inputId}: PDF generated successfully in ${durationInMs} ms, file size is ${fileSizeInKB}K`);
      processingTime += durationInMs;
      start = hrtime.bigint();
      res.sendFile(pdfRendererOutputFileName, async (err) => {
        if (err) {
          logIt(`Typeset ${inputId}: ERROR sending file '${pdfRendererOutputFileName}': ${err}`);
          res.status(500).send("Internal Server Error: could not send generated PDF File");
        } else {
          // all good
          try {
            await unlink(pdfRendererOutputFileName);
          } catch (err) {
            logIt(`Typeset ${inputId}: WARNING could not delete tmp PDF file '${pdfRendererOutputFileName}'`);
          }
          let end = hrtime.bigint();
          let durationInMs = Math.round(Number(end-start)/1000000);
          processingTime += durationInMs;
          logIt(`Typeset ${inputId}: PDF sent successfully in ${durationInMs} ms`);
          logIt(`Typeset ${inputId}: Total processing time = ${processingTime} ms`);
        }
      });

    }
  });

  pdfRendererProcess.on('error', () => {
    logIt(`Typeset ${inputId}: ERROR - Failed to start PdfRenderer process`);
    if (!res.headersSent){
      res.status(500).send("Internal Server Error: could not start PDF renderer process");
    }
  });
});

typesettingServer.listen(PORT, () => {
  logIt(`Server is listening at http://localhost:${PORT}`);
});


function logIt(msg) {
  let now = new Date();
  console.log(`[${now.toISOString()}] ${msg}`);
}

/**
 * @return string
 */
function getRandomId() {
  return Math.round(100000000000 * Math.random()).toString(30);
}

/**
 *
 * @param {string}configFileName
 * @returns {Promise<any>}
 */
async function readConfig(configFileName) {
  const fileContent = await readFile(configFileName, 'utf8');
  return YAML.parse(fileContent.toString());
}

function logLines(data, inputId, name) {
  const lines = data.toString().split("\n");
  lines.forEach( (line) => {
    line = line.trim();
    if (line !== '') {
      logIt(`Typeset ${inputId}: ${name}  ${line}`);
    }
  });
}