import * as fs from "node:fs";
import {LoggerInterface, LogLevel} from "./LoggerInterface";


export class SimpleLogger implements LoggerInterface {

  private readonly logToConsole: boolean = true;
  private readonly fileName: string = '';

  constructor(fileName = '', logToConsole = true) {
    this.logToConsole = logToConsole;
    this.fileName = fileName;
  }

  debug(message: string): void {
    this.log(message, 'debug');
  }

  warn(message: string): void {
    this.log(message, 'warn');
  }

  info(message: string): void {
    this.log(message, 'info');
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

  error(message: string): void {
    this.log(message, 'error');
  }

  private getTimeString(): string {
    return (new Date().toISOString()).replace(/Z/, '+00:00');
  }


}