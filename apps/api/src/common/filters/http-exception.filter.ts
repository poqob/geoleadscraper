import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = exception.getResponse();

    const url = httpAdapter.getRequestUrl(ctx.getRequest());
    const message = exception.message;

    // Validation
    const validation: string[] =
      typeof responseBody === 'object' && 'message' in responseBody
        ? (responseBody as any).message
        : undefined;
    const isValidation = Array.isArray(validation) && validation.length > 0;

    const error = {
      status,
      url,
      message,
      validation: isValidation ? validation : undefined,
    };

    // logger.error(error);

    httpAdapter.reply(ctx.getResponse(), error, status);
  }
}
