import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    const requestId = headers['x-request-id'] || this.generateRequestId();

    this.logger.info('Incoming request', {
      type: 'request',
      requestId,
      method,
      url,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();
        
        this.logger.info('Request completed', {
          type: 'response',
          requestId,
          method,
          url,
          statusCode: response.statusCode,
          duration,
          durationMs: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        this.logger.error('Request failed', {
          type: 'error',
          requestId,
          method,
          url,
          statusCode: error.status || 500,
          duration,
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        
        return throwError(() => error);
      }),
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
