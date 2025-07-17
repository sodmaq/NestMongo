import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { pinoLogger } from './pino-logger';
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const start = Date.now();

    // When the response is finished, log status and duration
    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') || '0';
      const duration = Date.now() - start;

      pinoLogger.info(
        `${method} ${originalUrl} ${statusCode} - ${contentLength}b - ${duration}ms`,
      );
    });

    next();
  }
}
