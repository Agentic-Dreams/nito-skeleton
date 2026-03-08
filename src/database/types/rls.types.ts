/**
 * Tipos para el sistema RLS (Row Level Security)
 */

import { NodePgDatabase } from 'drizzle-orm/node-postgres';

/** Contexto de usuario para RLS */
export interface RlsContext {
  userId: string;
  role: string;
  email?: string;
}

/** Variables que se establecen en PostgreSQL para RLS */
export interface RlsVariables {
  'app.current_user_id': string;
  'app.current_user_role': string;
  'app.current_user_email'?: string;
}

/** Resultado de una operación en contexto RLS */
export interface RlsResult<T> {
  data: T;
  context: RlsContext;
}

/** Callback para ejecutar dentro de una transacción RLS */
export type RlsTransactionCallback<T, S extends Record<string, unknown> = Record<string, unknown>> = (
  tx: NodePgDatabase<S>,
  context: RlsContext,
) => Promise<T>;
