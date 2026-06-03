
export type LogLevel = 'info' | 'error' | 'debug' | 'warn';
export interface LoggerInterface {
    log(message: string, logLevel: LogLevel): void;
    error(message: string): void;
    debug(message: string): void;
    warn(message: string): void;
    info(message: string): void;
}