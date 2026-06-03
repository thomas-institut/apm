import * as fs from "node:fs";
import {LoggerInterface, LogLevel} from "./LoggerInterface";
import kleur from 'kleur';

interface SimpleLoggerOptions {
  logToConsole?: boolean;
  useColorInConsole?: boolean;
  fileName?: string;
}

export class SimpleLogger implements LoggerInterface {

  private readonly logToConsole: boolean;
  private fileName: string;
  private readonly useColor: boolean;

  constructor(options: SimpleLoggerOptions = {}) {
    this.logToConsole = options.logToConsole ?? true;
    this.fileName = options.fileName ?? '';
    this.useColor = options.useColorInConsole ?? true;
  }

  setFileName(fileName: string): void {
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


  /**
   * Logs a message with the specified level
   *
   * If the level is 'info', the message can be highlighted as well
   * @param message
   * @param level
   * @param highlight
   */
  log(message: string, level: LogLevel = 'info', highlight: boolean = false): void {
    let logLine = `[${this.getTimeString()}] ${level.toUpperCase().padEnd(5)}  ${message}`;

    if (this.logToConsole) {
      switch (level) {
        case 'error':
          console.error(this.withErrorColor(logLine));
          break;
        case 'warn':
          console.warn(this.withWarnColor(logLine));
          break;

        case 'debug':
          console.log(this.withDebugColor(logLine));
          break;
        case 'info':
          console.log(this.withInfoColor(logLine, highlight));
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

  private withErrorColor(message: string): string {
    return this.useColor ? kleur.red(message) : message;
  }

  private withWarnColor(message: string): string {
    return this.useColor ? kleur.yellow(message) : message;
  }

  private withDebugColor(message: string): string {
    return this.useColor ? kleur.grey(message) : message;
  }

  private withInfoColor(message: string, highlight: boolean): string {
    return this.useColor && highlight ? kleur.cyan().bold(message) : message;
  }


}