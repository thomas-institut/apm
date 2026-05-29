import * as fs from "node:fs";

type LogLevel = 'info' | 'error' | 'debug' | 'warn';

export class SimpleLogger {

  private readonly logToConsole: boolean = true;
  private readonly fileName: string = '';

  constructor(fileName = '', logToConsole = true) {
    this.logToConsole = logToConsole;
    this.fileName = fileName;
  }


  log(message: string, level: LogLevel = 'info'): void {
    let logLine = `[${this.getTimeString()}] ${level.toUpperCase()}: ${message}`;

    if (this.logToConsole) {
      switch (level) {
        case 'error':
          console.error(logLine);
          break;
        case 'warn':
          console.warn(logLine);
          break;
        default:
          console.log(logLine);
      }
    }
    if (this.fileName !== '') {
      fs.appendFileSync(this.fileName, logLine + '\n');
    }
  }

  private getTimeString(): string {
    return (new Date().toISOString()).replace(/Z/, '+00:00');
  }


}