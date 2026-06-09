import {LoggerInterface, LogLevel} from "@/lib/Logger/LoggerInterface";

export class ConsoleLogger implements LoggerInterface{
  debug(message: string): void {
    this.log(message, 'debug');
  }

  error(message: string): void {
    this.log(message, 'error');
  }

  info(message: string): void {
    this.log(message, 'info');
  }

  log(message: string, logLevel: LogLevel): void {
    switch (logLevel) {
      case 'info':
        console.info(message);
        break;

      case 'warn':
        console.warn(message);
        break;

      default:
        console.log(`${logLevel}: ${message}`);
    }
  }

  warn(message: string): void {
    this.log(message, 'warn');
  }

}