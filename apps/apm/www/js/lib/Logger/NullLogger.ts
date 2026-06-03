import {LoggerInterface, LogLevel} from "./LoggerInterface.js";


export class NullLogger implements LoggerInterface {
  debug(_message: string): void {
  }

  error(_message: string): void {
  }

  info(_message: string): void {
  }

  log(_message: string, _logLevel: LogLevel): void {
  }

  warn(_message: string): void {
  }

}