// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { pinoLogger } from 'src/middlewares/logger/pino-logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage = 'Internal server error';
    let errorDetails: string[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const res = exception.getResponse();
      if (typeof res === 'string') {
        errorMessage = res;
      } else if (typeof res === 'object') {
        errorMessage = (res as any).message || errorMessage;
        if (Array.isArray((res as any).message)) {
          errorDetails = (res as any).message;
          errorMessage = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    // 🟡 Log error
    pinoLogger.error({
      method: request.method,
      url: request.url,
      statusCode: status,
      message: errorMessage,
      stack: exception instanceof Error ? exception.stack : null,
    });

    // 🔵 Unified response
    response.status(status).json({
      status: 'error',
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message: errorMessage,
      errors: errorDetails.length ? errorDetails : undefined,
    });
  }
}
