/**
 * RlsService - Servicio para ejecutar queries en contexto RLS seguro
 *
 * Este servicio proporciona un wrapper para ejecutar operaciones de base de datos
 * dentro de una transacción que establece las variables de sesión necesarias
 * para que las políticas RLS de PostgreSQL funcionen correctamente.
 *
 * VENTAJAS del enfoque por transacción:
 * 1. Aislamiento completo - cada request tiene su propia transacción
 * 2. Sin fugas de contexto entre conexiones del pool
 * 3. Rollback automático si hay errores
 * 4. Variables RLS son locales a la transacción
 *
 * Uso básico:
 * ```typescript
 * const result = await this.rlsService.execute(user, async (tx, context) => {
 *   return tx.select().from(dogs).where(eq(dogs.id, id));
 * });
 * ```
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from './database.constants';
import * as schema from './schema';
import { RlsContext, RlsTransactionCallback } from './types/rls.types';

interface JwtUser {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class RlsService {
  private readonly logger = new Logger(RlsService.name);

  constructor(
    @Inject(DRIZZLE_PROVIDER) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Ejecuta una operación dentro de una transacción con contexto RLS
   *
   * @param user - Usuario autenticado (de JwtAuthGuard)
   * @param callback - Función a ejecutar dentro de la transacción
   * @returns Resultado de la operación
   */
  async execute<T>(
    user: JwtUser | RlsContext,
    callback: RlsTransactionCallback<T, typeof schema>,
  ): Promise<T> {
    const context: RlsContext = {
      userId: user.userId,
      role: user.role,
      email: user.email,
    };

    this.logger.debug(`Starting RLS transaction for user: ${context.userId}, role: ${context.role}`);

    return this.db.transaction(async (tx) => {
      // Establecer variables de sesión para RLS
      // SET LOCAL hace que las variables sean locales a la transacción
      await tx.execute(
        sql`SELECT set_config('app.current_user_id', ${context.userId}, true)`
      );
      await tx.execute(
        sql`SELECT set_config('app.current_user_role', ${context.role}, true)`
      );
      if (context.email) {
        await tx.execute(
          sql`SELECT set_config('app.current_user_email', ${context.email}, true)`
        );
      }

      this.logger.debug(`RLS context set, executing transaction`);

      try {
        // Ejecutar el callback con la transacción y el contexto
        const result = await callback(tx as unknown as NodePgDatabase<typeof schema>, context);

        this.logger.debug(`RLS transaction completed successfully`);

        return result;
      } catch (error) {
        this.logger.error(`RLS transaction failed: ${(error as Error).message}`);
        throw error;
      }
    });
  }

  /**
   * Ejecuta una operación sin RLS (para operaciones de administrador o sistema)
   *
   * @param callback - Función a ejecutar dentro de la transacción
   */
  async executeWithoutRls<T>(
    callback: RlsTransactionCallback<T, typeof schema>,
  ): Promise<T> {
    this.logger.debug(`Starting transaction without RLS`);

    return this.db.transaction(async (tx) => {
      // Establecer rol como SYSTEM para bypass RLS (si está configurado)
      await tx.execute(
        sql`SELECT set_config('app.current_user_role', 'SYSTEM', true)`
      );

      try {
        const result = await callback(tx as unknown as NodePgDatabase<typeof schema>, {
          userId: 'system',
          role: 'SYSTEM',
        });

        this.logger.debug(`Non-RLS transaction completed successfully`);

        return result;
      } catch (error) {
        this.logger.error(`Non-RLS transaction failed: ${(error as Error).message}`);
        throw error;
      }
    });
  }

  /**
   * Verifica si el usuario tiene rol de administrador
   */
  isAdmin(user: JwtUser | RlsContext): boolean {
    return user.role === 'ADMIN';
  }

  /**
   * Verifica si el usuario tiene rol de cliente
   */
  isCustomer(user: JwtUser | RlsContext): boolean {
    return user.role === 'CUSTOMER';
  }
}
