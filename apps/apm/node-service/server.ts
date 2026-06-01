import express from 'express';
import {PangoMeasurerNodeGTK} from './PangoMeasurerNodeGTK.js';
// @ts-ignore
import GI from 'node-gtk';
import {processInputJson} from './processInputJson.js';
import bodyParser from 'body-parser';
import {spawn} from 'node:child_process';
import process, {hrtime} from 'node:process';
import {readFile, stat, unlink} from 'fs/promises';
import YAML from 'yaml';
import {SimpleLogger} from "./SimpleLogger/SimpleLogger.js";


const Pango = GI.require('Pango');
const usage = `Usage: node server.js  /absolute/path/to/config.yaml`;

if (process.argv.length < 3) {
  console.log(usage);
  process.exit(1);
}


console.log(`Config file is ${process.argv[2]}`);

const config = await readConfig(process.argv[2]);

if (config.typesettingServer === undefined) {
  config.typesettingServer = {};
}

const PORT: number = config.typesettingServer['port'] ?? 4711;
const PdfRenderer: string = config.typesettingServer['pdfRenderer'] ?? `/usr/bin/python3 /opt/apm/typesetting-service/pdf-renderer.py`;
const TmpDir: string = config.typesettingServer['tmpDir'] ?? '/var/apm/typesetting-tmp';
const LogFile: string = config.typesettingServer['logFile'] ?? '/var/apm/logs/typesetting-service/server.log';

console.log(`  Port: ${PORT}`);
console.log(`  PdfRenderer: ${PdfRenderer}`);
console.log(`  LogFile: ${LogFile}`);
console.log(`  TmpDir: ${TmpDir}`);

const logger = new SimpleLogger(LogFile);
const typesettingServer = express();

typesettingServer.use(bodyParser.json({limit: '50mb'}));

typesettingServer.get('/api/measure', (req, res) => {

  let text = req.query.text?.toString() ?? 'Sample string';
  let font = req.query.font?.toString() ?? 'Arial';
  let size = parseInt(req.query.size?.toString() ?? '12');

  let measurer = new PangoMeasurerNodeGTK();
  const scale = 1000;

  let measurements = measurer.measureText(text, `${font} ${scale * size}`);

  res.json({
    text: text, font: font, fontSize: size, measurements: {
      width: measurements.logical.width / (Pango.SCALE * scale),
      height: measurements.logical.height / (Pango.SCALE * scale)
    }
  });
});

typesettingServer.post('/api/typeset', async (req, res) => {
  let data = req.body;
  if (data === undefined) {
    logIt(`Error typesetting: No JSON in input`);
    res.json({error: true, errorMsg: "No JSON in input"});
  }
  let inputId = data.id ?? getRandomId();
  logIt(`${inputId}: Start`);

  let outputType = req.query.output ?? 'pdf';
  let processingTime = 0;


  let outputData = await processInputJson(data);
  if (outputData.error) {
    logIt(`${inputId}: Error typesetting: ${outputData.errorMsg}`);
    res.status(401).json({error: true, errorMsg: outputData.errorMsg});
    return;
  } else {
    // @ts-ignore
    processingTime += Math.round(outputData.stats.processingTime);
    logIt(`${inputId}: Typesetting done in ${processingTime} ms`);
  }
  if (outputType === 'json') {
    logIt(`${inputId}: Sending JSON out`);
    res.json(outputData);
    return;
  }

  // go on with PDF!

  let start = hrtime.bigint();
  let pdfRendererInput = JSON.stringify(outputData.output);
  const pdfRendererInputInKb = Math.round(pdfRendererInput.length / 1024);

  logIt(`${inputId}: Sending JSON to PdfRenderer, size is ${pdfRendererInputInKb}K`);


  let pdfRendererCmdParts = PdfRenderer.split(' ');
  const pdfRendererOutputFileName = `${TmpDir}/${inputId}.pdf`;

  const pdfRendererProcess = spawn(pdfRendererCmdParts[0], [...pdfRendererCmdParts.slice(1), pdfRendererOutputFileName]);
  pdfRendererProcess.stdin.write(pdfRendererInput);
  pdfRendererProcess.stdin.end();


  pdfRendererProcess.stderr.on('data', (data) => {
    logLines(data, inputId, "PdfRenderer STDERR");
  });

  pdfRendererProcess.stdout.on('data', (data) => {
    logLines(data, inputId, "PdfRenderer STDOUT");
  });

  pdfRendererProcess.on('close', async (code) => {
    if (code !== 0) {
      logIt(`${inputId}: ERROR - PdfRenderer exited with code ${code}`);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error: PdfRenderer returned with error");
      }
    } else {
      let end = hrtime.bigint();
      let durationInMs = Math.round(Number(end - start) / 1000000);
      const fileStats = await stat(pdfRendererOutputFileName);
      const fileSizeInKB = Math.round(fileStats.size / 1024);

      logIt(`${inputId}: PDF generated successfully in ${durationInMs} ms, file size is ${fileSizeInKB}K`);
      processingTime += durationInMs;
      start = hrtime.bigint();
      res.sendFile(pdfRendererOutputFileName, async (err) => {
        if (err) {
          logIt(`${inputId}: ERROR sending file '${pdfRendererOutputFileName}': ${err}`);
          res.status(500).send("Internal Server Error: could not send generated PDF File");
        } else {
          // all good
          try {
            await unlink(pdfRendererOutputFileName);
          } catch (err) {
            logIt(`${inputId}: WARNING could not delete tmp PDF file '${pdfRendererOutputFileName}'`);
          }
          let end = hrtime.bigint();
          let durationInMs = Math.round(Number(end - start) / 1000000);
          processingTime += durationInMs;
          logIt(`${inputId}: PDF sent successfully in ${durationInMs} ms`);
          logIt(`${inputId}: Total processing time = ${processingTime} ms`);
        }
      });

    }
  });

  pdfRendererProcess.on('error', () => {
    logIt(`${inputId}: ERROR - Failed to start PdfRenderer process`);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error: could not start PDF renderer process");
    }
  });
});

const httpServer = typesettingServer.listen(PORT, () => {
  logIt(`Server is listening at http://localhost:${PORT}`);
});

// Ensure the port is released promptly when the process is stopped.
// Without an explicit shutdown, lingering keep-alive connections can keep
// the socket bound, causing EADDRINUSE on the next start.
function shutdown(signal: string) {
  logIt(`Received ${signal}, shutting down...`);
  // Stop accepting new connections.
  httpServer.close((err) => {
    if (err) {
      logIt(`Error while closing server: ${err}`);
      process.exit(1);
    }
    logIt(`Server closed cleanly`);
    process.exit(0);
  });
  // Force-close any idle/keep-alive connections so close() can complete.
  // Available on Node >= 18.2.
  // @ts-ignore
  if (typeof httpServer.closeAllConnections === 'function') {
    // @ts-ignore
    httpServer.closeAllConnections();
  }
  // Safety net: if shutdown hangs, exit forcefully.
  setTimeout(() => {
    logIt(`Shutdown timed out, forcing exit`);
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));


function logIt(msg: string) {
  logger.log(msg);
}

function getRandomId(): string {
  return Math.round(100000000000 * Math.random()).toString(30);
}

/**
 *
 * @param {string}configFileName
 * @returns {Promise<any>}
 */
async function readConfig(configFileName: string): Promise<any> {
  const fileContent = await readFile(configFileName, 'utf8');
  return YAML.parse(fileContent.toString());
}

function logLines(data: any, inputId: string, name: string): void {
  const lines: string[] = data.toString().split("\n");
  lines.forEach((line) => {
    line = line.trim();
    if (line !== '') {
      logIt(`${inputId}: ${name}  ${line}`);
    }
  });
}