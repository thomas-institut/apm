import {TypesetOutputData} from "#src/Actions/Typeset/Typeset.js";
import {spawn} from "node:child_process";
import {stat} from "fs/promises";
import {LoggerInterface} from "#src/SimpleLogger/LoggerInterface.js";


interface GeneratePdfOptions {
  logger: LoggerInterface;
  pdfRendererPath: string;
  tmpDir: string;
}

export interface GeneratePdfOutput {
  fileName: string;
  fileSize: number;
  error: boolean;
  errorMessage: string;
}

export class GeneratePdf implements Action<TypesetOutputData, GeneratePdfOutput> {
  private logger: LoggerInterface;
  private pdfRendererPath: string;
  private readonly tmpDir: string;

  constructor(options: GeneratePdfOptions) {
    this.logger = options.logger;
    this.pdfRendererPath = options.pdfRendererPath;
    this.tmpDir = options.tmpDir;

  }

  execute(typesetOutput: TypesetOutputData): Promise<GeneratePdfOutput> {
    return new Promise((resolve) => {
      const inputId = typesetOutput.id;
      let pdfRendererInput = JSON.stringify(typesetOutput.output);
      const pdfRendererInputInKb = Math.round(pdfRendererInput.length / 1024);
      this.logger.info(`${inputId}: Sending JSON to PdfRenderer, size is ${pdfRendererInputInKb}K`);

      let pdfRendererCmdParts = this.pdfRendererPath.split(' ');
      const pdfRendererOutputFileName = `${this.tmpDir}/${inputId}.pdf`;

      const pdfRendererProcess = spawn(pdfRendererCmdParts[0], [...pdfRendererCmdParts.slice(1), pdfRendererOutputFileName]);
      pdfRendererProcess.stdin.write(pdfRendererInput);
      pdfRendererProcess.stdin.end();
      pdfRendererProcess.stderr.on('data', (data) => {
        this.logLines(data, inputId, "PdfRenderer STDERR");
      });

      pdfRendererProcess.stdout.on('data', (data) => {
        this.logLines(data, inputId, "PdfRenderer STDOUT");
      });

      pdfRendererProcess.on('close', async (code) => {
        if (code !== 0) {
          this.logger.error(`${inputId}: ERROR - PdfRenderer exited with code ${code}`);
          resolve({
            fileName: '',
            fileSize: 0,
            error: true,
            errorMessage: 'PdfRenderer returned with error'
          });
        } else {
          const fileStats = await stat(pdfRendererOutputFileName);
          resolve({
            fileName: pdfRendererOutputFileName,
            fileSize: fileStats.size,
            error: false,
            errorMessage: ''
          });
        }
      });

      pdfRendererProcess.on('error', () => {
        this.logger.error(`${inputId}: ERROR - Failed to start PdfRenderer process`);
        resolve({
          fileName: '',
          fileSize: 0,
          error: true,
          errorMessage: 'Could not start PDF renderer process'
        });
      });
    });
  }

  private logLines(data: any, inputId: string, name: string): void {
    const lines: string[] = data.toString().split("\n");
    lines.forEach((line) => {
      line = line.trim();
      if (line !== '') {
        this.logger.info(`${inputId}: ${name}  ${line}`);
      }
    });
  }
}