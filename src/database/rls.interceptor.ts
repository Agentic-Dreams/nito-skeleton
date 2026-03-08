import {
  Injectable,
  Logger,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_PROVIDER } from './database.module';
import { USE_RLS_KEY } from '../common/decorators/use-rls.decorator';
import * as schema from './schema';

/**
 * RLS Interceptor
 *
 * Establece las variables de sesión de PostgreSQL antes de cada request
 * para que Row Level Security (RLS) filtre datos automáticamente.
 *
 * Solo actúa en rutas marcadas con @UseRls() o en controllers con @UseRls().
 *
 * Variables establecidas:
 * - app.current_user_id:   UUID del usuario autenticado
 * - app.current_user_role: Rol del usuario (ADMIN/CUSTOMER/etc.)
 *
 * Uso en políticas RLS PostgreSQL:
 *   current_setting('app.current_user_id', true)::uuid
 *   current_setting('app.current_user_role', true)
 *
 * Nota: RlsService.execute() usa SET LOCAL (transaction-local) que
 * es el mecanismo principal. Este interceptor usa SET (session-level)
 * como capa de compatibilidad.
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RlsInterceptor.name);

  constructor(
    @Inject(DRIZZLE_PROVIDER) private readonly db: NodePgDatabase<typeof schema>,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const useRls = this.reflector.getAllAndOverride<boolean>(USE_RLS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!useRls) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.userId && user?.role) {
      this.logger.debug(`Setting RLS session context for user: ${user.userId}, role: ${user.role}`);

      await this.db.execute(
        sql`SELECT set_config('app.current_user_id', ${user.userId}, false)`,
      );
      await this.db.execute(
        sql`SELECT set_config('app.current_user_role', ${user.role}, false)`,
      );
    }

    return next.handle();
  }
}
