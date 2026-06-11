import { ServiceException } from '@/common/exceptions';

import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError } from 'rxjs';

@Injectable()
export class ServiceExceptionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof ServiceException) {
          const { message, status } = error;
          throw new HttpException(message, status);
        } else {
          console.log('service error:', error);
          throw error;
        }
      }),
    );
  }
}
