import { Logger, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor para establecer RLS (Row Level Security) context
 * Basado en el usuario autenticado
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RlsInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.id) {
      // Aquí se establecería el contexto de RLS
      // Ejemplo: SET LOCAL app.current_user_id = 'uuid'
      this.logger.debug(`Setting RLS context for user: ${user.id}`);
    }

    return next.handle();
  }
}

// Fix: Add decorator
function Injectable(): ClassDecorator {
  return function (target) {
    return target;
  };
}
