/**
 * Paginate Utility - Helper genérico de paginación para Drizzle ORM
 *
 * Proporciona una interfaz unificada para consultas paginadas con conteo total.
 */

import { SQL, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PaginationParams, PaginationMeta, PaginatedResponse } from '../types/query.types';

/**
 * Crea metadatos de paginación
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const lastPage = Math.ceil(total / limit) || 1;

  return {
    total,
    page,
    limit,
    lastPage,
    hasNextPage: page < lastPage,
    hasPreviousPage: page > 1,
  };
}

/**
 * Calcula skip/take a partir de page/limit
 */
export function calculatePagination(
  page: number,
  limit: number,
): { skip: number; take: number } {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Ejecuta una consulta paginada con conteo total
 * Versión simplificada que trabaja con cualquier query de Drizzle
 */
export async function paginate<T>(
  dataQuery: { limit: (n: number) => { offset: (n: number) => Promise<T[]> } },
  countResult: Promise<number> | number,
  options: PaginationParams,
): Promise<PaginatedResponse<T>> {
  const { page, limit, skip, take } = options;

  // Ejecutar queries
  const [data, total] = await Promise.all([
    dataQuery.limit(take).offset(skip),
    Promise.resolve(countResult),
  ]);

  const totalCount = typeof total === 'number' ? total : 0;
  const lastPage = Math.ceil(totalCount / limit) || 1;

  return {
    data,
    meta: {
      total: totalCount,
      page,
      limit,
      lastPage,
      hasNextPage: page < lastPage,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Versión para trabajar directamente con la base de datos
 */
export async function paginateDb<T extends PgTable, S extends Record<string, unknown>>(
  db: NodePgDatabase<S>,
  table: T,
  options: PaginationParams,
  where?: SQL,
  orderBy?: SQL,
): Promise<PaginatedResponse<unknown>> {
  const { page, limit, skip, take } = options;

  // Build data query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataQuery = (db as any).select().from(table) as {
    where: (c: SQL) => unknown;
    orderBy: (c: SQL) => unknown;
    limit: (n: number) => { offset: (n: number) => Promise<unknown[]> };
  };

  if (where) {
    dataQuery = dataQuery.where(where) as typeof dataQuery;
  }
  if (orderBy) {
    dataQuery = dataQuery.orderBy(orderBy) as typeof dataQuery;
  }

  // Build count query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let countQuery = (db as any).select({ count: sql<number>`count(*)` }).from(table) as {
    where?: (c: SQL) => Promise<{ count: number }[]>;
  };

  const countPromise = where && countQuery.where
    ? countQuery.where(where).then(r => r[0]?.count || 0)
    : (countQuery as Promise<{ count: number }[]>).then(r => r[0]?.count || 0);

  const [data, totalCount] = await Promise.all([
    dataQuery.limit(take).offset(skip),
    countPromise,
  ]);

  const lastPage = Math.ceil(totalCount / limit) || 1;

  return {
    data,
    meta: {
      total: totalCount,
      page,
      limit,
      lastPage,
      hasNextPage: page < lastPage,
      hasPreviousPage: page > 1,
    },
  };
}
