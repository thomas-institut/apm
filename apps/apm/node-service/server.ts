import express from 'express';
import bodyParser from 'body-parser';
import process, {hrtime} from 'node:process';
import {readFile, unlink} from 'fs/promises';
import YAML from 'yaml';

import {SimpleLogger} from "./src/SimpleLogger/SimpleLogger.js";
import {Measure} from "./src/Actions/Measure/Measure.js";
import {Typeset} from "./src/Actions/Typeset/Typeset.js";
import {GeneratePdf} from "./src/Actions/GeneratePdf/GeneratePdf.js";

const VERSION = '1.2.9-dev-16';
const USAGE = `Usage: node server.js  /absolute/path/to/config.yaml`;

const DEFAULT_PORT = 4711;
const PDF_RENDERER  = 'pdf-renderer.py';
const DEFAULT_PYTHON_EXECUTABLE = '/usr/bin/python3';


if (process.argv.length < 3) {
  console.log(USAGE);
  process.exit(1);
}

console.log(`This is APM's node service version \x1b[1m${VERSION}\x1b[22m`);
console.log(`    `);
console.log(`    Config file: ${process.argv[2]}`);
const config = await readConfig(process.argv[2]);

if (config.nodeService === undefined) {
  console.error('Node service configuration is missing from config file');
  process.exit(1);
}

const Port: number = config.nodeService['port'] ?? DEFAULT_PORT;
const PythonExecutable: string = config.nodeService['pythonExecutable'] ?? DEFAULT_PYTHON_EXECUTABLE;
const PdfRendererPath: string = config.nodeService['pdfRendererPath'] ?? '.';
const PdfRenderer: string = `${PythonExecutable} ${PdfRendererPath}/${PDF_RENDERER}`;
const TmpDir: string = config.nodeService['tmpDir'] ?? '';
if (TmpDir === '') {
  console.error('Temporary directory (tmpDir) is required but not provided in the configuration.');
  process.exit(1);
}
const LogFile: string = config.nodeService['logFile'] ?? '';

if (LogFile === '') {
  console.error('Log file (logFile) is required but not provided in the configuration.');
  process.exit(1);
}

console.log(`    Port       : ${Port}`);
console.log(`    LogFile    : ${LogFile}`);
console.log(`    TmpDir     : ${TmpDir}`);
console.log(`    PdfRenderer: ${PdfRenderer}`);
console.log(`    `);

const logger = new SimpleLogger(LogFile);
const nodeServiceServer = express();
nodeServiceServer.use(bodyParser.json({limit: '50mb'}));

nodeServiceServer.get('/api/measure', (req, res) => {
  let text = req.query.text?.toString() ?? 'Sample string';
  let fontFamily = req.query.font?.toString() ?? 'Arial';
  let fontSize = parseInt(req.query.size?.toString() ?? '12');
  try {
    res.json(new Measure().execute({text, fontFamily, fontSize}));
  } catch (error) {
    logger.error(`Error measuring text: ${error}`);
    res.status(500).json({error: 'Error measuring text'});
    return;
  }
});

nodeServiceServer.post('/api/typeset', async (req, res) => {
  const callStart = hrtime.bigint();

  let data = req.body;
  if (data === undefined) {
    logger.error(`Error typesetting: No JSON in input`);
    res.json({error: true, errorMsg: "No JSON in input"});
    return;
  }
  let outputType = req.query.output ?? 'pdf';
  const typesetAction = new Typeset(logger);

  let outputData = await typesetAction.execute(data);
  const inputId = outputData.id;
  if (outputData.error) {
    logger.error(`${inputId}: Error typesetting: ${outputData.errorMsg}`);
    res.status(401).json({error: true, errorMsg: outputData.errorMsg});
    return;
  }
  const typesettingEnd = hrtime.bigint();
  logger.info(`${inputId}: Typesetting done in ${getDurationInMs(typesettingEnd, callStart)} ms`);

  if (outputType === 'json') {
    logger.info(`${inputId}: Sending JSON out`);
    res.json(outputData);
    return;
  }

  // go on with PDF

  const generatePdfAction = new GeneratePdf({logger, pdfRendererPath: PdfRenderer, tmpDir: TmpDir});
  const generatePdfOutput = await generatePdfAction.execute(outputData);
  if (generatePdfOutput.error) {
    logger.error(`${inputId}: Error generating PDF: ${generatePdfOutput.errorMessage}`);
    res.status(500).json({error: true, errorMsg: generatePdfOutput.errorMessage});
    return;
  }

  const pdfGenerationEnd = hrtime.bigint();
  logger.info(`${inputId}: PDF generation done in ${getDurationInMs(pdfGenerationEnd, typesettingEnd)} ms, file size is ${Math.round(generatePdfOutput.fileSize / 1024)} K`);

  res.sendFile(generatePdfOutput.fileName, async (err) => {
    if (err) {
      logger.error(`${inputId}: Error sending file '${generatePdfOutput.fileName}': ${err}`);
      res.status(500).send("Internal Server Error: could not send generated PDF File");
      return;
    } else {
      // all good
      try {
        await unlink(generatePdfOutput.fileName);
      } catch (err) {
        logger.warn(`${inputId}: Could not delete tmp PDF file '${generatePdfOutput.fileName}'`);
      }
      let end = hrtime.bigint();
      logger.info(`${inputId}: PDF sent successfully in ${getDurationInMs(end, pdfGenerationEnd)} ms`);
      logger.info(`${inputId}: Total processing time = ${getDurationInMs(end, callStart)} ms`);
    }
  });
});

const httpServer = nodeServiceServer.listen(Port, () => {
  logger.info(`Server is listening at http://localhost:${Port}`);
});

// Ensure the port is released promptly when the process is stopped.
// Without an explicit shutdown, lingering keep-alive connections can keep
// the socket bound, causing EADDRINUSE on the next start.
function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down...`);
  // Stop accepting new connections.
  httpServer.close((err) => {
    if (err) {
      logger.error(`Error while closing server: ${err}`);
      process.exit(1);
    }
    logger.info(`Server closed cleanly`);
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
    logger.info(`Shutdown timed out, forcing exit`);
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 *
 * @param {string}configFileName
 * @returns {Promise<any>}
 */
async function readConfig(configFileName: string): Promise<any> {
  const fileContent = await readFile(configFileName, 'utf8');
  return YAML.parse(fileContent.toString());
}

function getDurationInMs(end: bigint, start: bigint) {
  return Math.round(Number(end - start) / 1000000);
}