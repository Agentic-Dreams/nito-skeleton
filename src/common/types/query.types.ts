/**
 * Tipos para el sistema de Query Parsing universal
 * Soporta filtros dinámicos, paginación y ordenamiento
 */

/** Operadores de filtro soportados */
export type FilterOperator =
  | 'eq'    // equals (=)
  | 'ne'    // not equals (!=)
  | 'gt'    // greater than (>)
  | 'gte'   // greater than or equal (>=)
  | 'lt'    // less than (<)
  | 'lte'   // less than or equal (<=)
  | 'like'  // LIKE pattern match
  | 'ilike' // ILIKE case-insensitive match
  | 'in'    // IN array
  | 'nin'   // NOT IN array
  | 'is'    // IS NULL / IS NOT NULL
  | 'contains' // JSON/array contains
  | 'startsWith' // Starts with prefix
  | 'endsWith';  // Ends with suffix

/** Filtro individual campo -> operador -> valor */
export type FieldFilter = Partial<Record<FilterOperator, unknown>>;

/** Conjunto de filtros para una query */
export type FilterMap = Record<string, FieldFilter | unknown>;

/** Operadores lógicos para combinar filtros */
export interface LogicalOperators {
  AND?: FilterMap[];
  OR?: FilterMap[];
  NOT?: FilterMap;
}

/** Parámetros de paginación */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/** Parámetros de ordenamiento */
export interface SortParams {
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
}

/** Query parseada completa */
export interface ParsedQuery {
  filters: FilterMap & LogicalOperators;
  pagination: PaginationParams;
  sort: SortParams;
  originalQuery: Record<string, unknown>;
}

/** Opciones de configuración para el QueryParserPipe */
export interface QueryParserOptions {
  /** Campos permitidos para filtrar (whitelist) */
  allowedFields?: string[];
  /** Campos prohibidos para filtrar (blacklist) */
  forbiddenFields?: string[];
  /** Límite máximo de resultados por página */
  maxLimit?: number;
  /** Límite por defecto */
  defaultLimit?: number;
  /** Campos permitidos para ordenar */
  allowedSortFields?: string[];
  /** Campo por defecto para ordenar */
  defaultSortBy?: string;
  /** Orden por defecto */
  defaultSortOrder?: 'asc' | 'desc';
}

/** Meta información de paginación para la respuesta */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  lastPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Respuesta paginada estándar */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
