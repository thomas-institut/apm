import type {ErrorRequestHandler} from 'express';
import type {LoggerInterface} from '#www-js/lib/Logger/LoggerInterface';

export function createErrorHandler(
  logger: Pick<LoggerInterface, 'error'>,
): ErrorRequestHandler {
  return (error: unknown, _req, res, next) => {
    const errorMessage = error instanceof Error
      ? error.stack ?? error.message
      : String(error);
    logger.error(`Unhandled request error: ${errorMessage}`);

    if (res.headersSent) {
      next(error);
      return;
    }

    res.status(500).type('text/plain').send('Internal Server Error');
  };
}