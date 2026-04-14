import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as object)
        : { message: 'Internal server error' };

    Logger.error(`HTTP Exception: ${JSON.stringify(message)}`, (exception as Error).stack);
    response.status(status).json({
      ...(typeof message === 'string' ? { message } : message),
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
