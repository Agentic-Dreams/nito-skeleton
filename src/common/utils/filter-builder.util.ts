/**
 * Filter Builder Utility para Drizzle ORM
 *
 * Convierte filtros del QueryParserPipe en condiciones SQL de Drizzle.
 *
 * Ejemplo de uso:
 * ```typescript
 * const where = buildWhereClause(filters, dogs, {
 *   stringFields: ['name', 'breed'],
 *   numberFields: ['age', 'weight'],
 *   enumFields: { size: ['small', 'medium', 'large'] }
 * });
 *
 * const results = await db.select().from(dogs).where(where);
 * ```
 */

import {
  SQL,
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  like,
  ilike,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  and,
  or,
  not,
} from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { FilterMap, FieldFilter, LogicalOperators, FilterOperator } from '../types/query.types';

/** Configuración de tipos de campos para un tabla */
export interface FilterConfig<T extends PgTable = PgTable> {
  /** Campos de tipo string (para operadores like/ilike) */
  stringFields?: (keyof T['$inferSelect'])[];
  /** Campos de tipo número (para comparaciones) */
  numberFields?: (keyof T['$inferSelect'])[];
  /** Campos de tipo fecha (para comparaciones de fecha) */
  dateFields?: (keyof T['$inferSelect'])[];
  /** Campos de tipo booleano */
  booleanFields?: (keyof T['$inferSelect'])[];
  /** Campos enum con sus valores permitidos */
  enumFields?: Record<string, string[]>;
  /** Campos JSONB (para operadores contains) */
  jsonbFields?: (keyof T['$inferSelect'])[];
  /** Campos UUID */
  uuidFields?: (keyof T['$inferSelect'])[];
}

/**
 * Construye una cláusula WHERE para Drizzle ORM a partir de filtros parseados
 */
export function buildWhereClause<T extends PgTable>(
  filters: FilterMap & LogicalOperators,
  table: T,
  config?: FilterConfig<T>,
): SQL | undefined {
  const conditions: SQL[] = [];

  // Procesar operadores lógicos primero
  if (filters.AND && Array.isArray(filters.AND)) {
    const andConditions = filters.AND
      .map(f => buildWhereClause(f as FilterMap & LogicalOperators, table, config))
      .filter((c): c is SQL => c !== undefined);
    if (andConditions.length > 0) {
      const combined = and(...andConditions);
      if (combined) conditions.push(combined);
    }
  }

  if (filters.OR && Array.isArray(filters.OR)) {
    const orConditions = filters.OR
      .map(f => buildWhereClause(f as FilterMap & LogicalOperators, table, config))
      .filter((c): c is SQL => c !== undefined);
    if (orConditions.length > 0) {
      const combined = or(...orConditions);
      if (combined) conditions.push(combined);
    }
  }

  if (filters.NOT && typeof filters.NOT === 'object') {
    const notCondition = buildWhereClause(filters.NOT as FilterMap & LogicalOperators, table, config);
    if (notCondition) {
      conditions.push(not(notCondition));
    }
  }

  // Procesar filtros de campos individuales
  for (const [fieldName, filterValue] of Object.entries(filters)) {
    // Ignorar operadores lógicos ya procesados
    if (['AND', 'OR', 'NOT'].includes(fieldName)) continue;

    // Obtener la columna de la tabla
    const column = (table as Record<string, unknown>)[fieldName] as PgColumn;
    if (!column) continue;

    // El valor puede ser un FieldFilter o un valor directo
    if (filterValue && typeof filterValue === 'object' && !Array.isArray(filterValue)) {
      const fieldFilter = filterValue as FieldFilter;
      const condition = buildFieldCondition(column, fieldFilter);
      if (condition) {
        conditions.push(condition);
      }
    } else {
      // Valor directo - usar eq
      conditions.push(eq(column, filterValue));
    }
  }

  // Combinar todas las condiciones con AND
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

/**
 * Construye una condición SQL para un campo individual
 */
function buildFieldCondition(
  column: PgColumn,
  filter: FieldFilter,
): SQL | undefined {
  const conditions: SQL[] = [];

  for (const [operator, rawValue] of Object.entries(filter)) {
    const condition = buildOperatorCondition(column, operator as FilterOperator, rawValue);
    if (condition) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

/**
 * Construye una condición SQL para un operador específico
 */
function buildOperatorCondition(
  column: PgColumn,
  operator: FilterOperator,
  value: unknown,
): SQL | undefined {
  switch (operator) {
    case 'eq':
      if (value === null) {
        return isNull(column);
      }
      return eq(column, value);

    case 'ne':
      if (value === null) {
        return isNotNull(column);
      }
      return ne(column, value);

    case 'gt':
      return gt(column, value as number | string | Date);

    case 'gte':
      return gte(column, value as number | string | Date);

    case 'lt':
      return lt(column, value as number | string | Date);

    case 'lte':
      return lte(column, value as number | string | Date);

    case 'like':
      return like(column, String(value));

    case 'ilike':
      return ilike(column, String(value));

    case 'in':
      if (Array.isArray(value) && value.length > 0) {
        return inArray(column, value);
      }
      return undefined;

    case 'nin':
      if (Array.isArray(value) && value.length > 0) {
        return notInArray(column, value);
      }
      return undefined;

    case 'is':
      if (value === null || (typeof value === 'object' && 'not' in value && value.not === null)) {
        return isNull(column);
      }
      return isNotNull(column);

    case 'startsWith':
      return like(column, `${String(value)}%`);

    case 'endsWith':
      return like(column, `%${String(value)}`);

    default:
      return undefined;
  }
}

/**
 * Helper para crear un ordenamiento seguro de Drizzle
 */
export function buildOrderByClause<T extends PgTable>(
  sortBy: string | null,
  sortOrder: 'asc' | 'desc',
  table: T,
): SQL | undefined {
  if (!sortBy) return undefined;

  const column = (table as Record<string, unknown>)[sortBy] as PgColumn;
  if (!column) return undefined;

  return sortOrder === 'desc'
    ? sql`${column} DESC`
    : sql`${column} ASC`;
}

// Import sql para orderBy
import { sql } from 'drizzle-orm';

/**
 * Normaliza un valor según el tipo de campo
 */
export function normalizeValue(
  value: unknown,
  fieldName: string,
  config?: FilterConfig,
): unknown {
  if (config?.booleanFields?.includes(fieldName)) {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  }

  if (config?.numberFields?.includes(fieldName)) {
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? value : parsed;
    }
    return Number(value);
  }

  if (config?.dateFields?.includes(fieldName)) {
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date;
    }
    return value instanceof Date ? value : new Date(value as string);
  }

  return value;
}
