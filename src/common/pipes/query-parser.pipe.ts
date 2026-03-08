/**
 * QueryParserPipe - Pipe Universal para Parseo de Query Parameters
 *
 * Convierte query parameters con notación de corchetes a filtros estructurados.
 *
 * Ejemplos de uso:
 * ?name[eq]=Fido&size[in]=small,medium&age[gte]=2
 * ?search[ilike]=%max%&isActive[eq]=true
 * ?page=2&limit=25&sortBy=name&sortOrder=asc
 *
 * Operadores soportados:
 * - eq, ne: igual / no igual
 * - gt, gte: mayor que / mayor o igual
 * - lt, lte: menor que / menor o igual
 * - like, ilike: LIKE / ILIKE (case-insensitive)
 * - in, nin: en array / no en array (valores separados por coma)
 * - is: IS NULL / IS NOT NULL (usar 'null' o 'not_null')
 * - startsWith, endsWith: empieza / termina con
 */

import {
  PipeTransform,
  Injectable,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import {
  FilterOperator,
  FieldFilter,
  FilterMap,
  LogicalOperators,
  PaginationParams,
  SortParams,
  ParsedQuery,
  QueryParserOptions,
} from '../types/query.types';

const VALID_OPERATORS: FilterOperator[] = [
  'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
  'like', 'ilike', 'in', 'nin', 'is',
  'contains', 'startsWith', 'endsWith',
];

const DEFAULT_OPTIONS: Required<QueryParserOptions> = {
  allowedFields: [],
  forbiddenFields: [],
  maxLimit: 100,
  defaultLimit: 10,
  allowedSortFields: [],
  defaultSortBy: 'createdAt',
  defaultSortOrder: 'desc',
};

@Injectable()
export class QueryParserPipe implements PipeTransform {
  private options: Required<QueryParserOptions>;

  constructor(@Optional() options?: QueryParserOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  transform(value: Record<string, unknown>): ParsedQuery {
    const originalQuery = { ...value };

    // Extraer parámetros de paginación
    const pagination = this.extractPagination(value);

    // Extraer parámetros de ordenamiento
    const sort = this.extractSort(value);

    // Extraer filtros del resto de parámetros
    const filters = this.extractFilters(value);

    return {
      filters,
      pagination,
      sort,
      originalQuery,
    };
  }

  /**
   * Extrae y valida parámetros de paginación
   */
  private extractPagination(query: Record<string, unknown>): PaginationParams {
    let page = 1;
    let limit = this.options.defaultLimit;

    // Parsear page
    if (query.page !== undefined) {
      const parsedPage = parseInt(String(query.page), 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        throw new BadRequestException('Page must be a positive integer');
      }
      page = parsedPage;
    }

    // Parsear limit
    if (query.limit !== undefined) {
      const parsedLimit = parseInt(String(query.limit), 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        throw new BadRequestException('Limit must be a positive integer');
      }
      limit = Math.min(parsedLimit, this.options.maxLimit);
    }

    // Calcular skip y take para la base de datos
    const skip = (page - 1) * limit;
    const take = limit;

    return { page, limit, skip, take };
  }

  /**
   * Extrae y valida parámetros de ordenamiento
   */
  private extractSort(query: Record<string, unknown>): SortParams {
    let sortBy: string | null = this.options.defaultSortBy;
    let sortOrder: 'asc' | 'desc' = this.options.defaultSortOrder;

    // Validar campo de ordenamiento
    if (query.sortBy !== undefined) {
      const field = String(query.sortBy);
      if (this.options.allowedSortFields.length > 0 &&
          !this.options.allowedSortFields.includes(field)) {
        throw new BadRequestException(
          `Sort by '${field}' is not allowed. Allowed fields: ${this.options.allowedSortFields.join(', ')}`
        );
      }
      sortBy = field;
    }

    // Validar dirección de ordenamiento
    if (query.sortOrder !== undefined) {
      const order = String(query.sortOrder).toLowerCase();
      if (order !== 'asc' && order !== 'desc') {
        throw new BadRequestException('Sort order must be either "asc" or "desc"');
      }
      sortOrder = order;
    }

    return { sortBy, sortOrder };
  }

  /**
   * Extrae filtros de los query parameters
   * Soporta notación de corchetes: ?campo[operador]=valor
   */
  private extractFilters(query: Record<string, unknown>): FilterMap & LogicalOperators {
    const filters: FilterMap & LogicalOperators = {};

    // Campos a ignorar (paginación y ordenamiento)
    const reservedFields = ['page', 'limit', 'sortBy', 'sortOrder'];

    for (const [key, rawValue] of Object.entries(query)) {
      // Ignorar campos reservados
      if (reservedFields.includes(key)) continue;

      // Ignorar valores undefined o null
      if (rawValue === undefined || rawValue === null) continue;

      const value = String(rawValue);

      // Parsear notación de corchetes: campo[operador]
      const bracketMatch = key.match(/^(.+)\[(\w+)\]$/);

      if (bracketMatch) {
        const [, field, operator] = bracketMatch;

        // Validar operador
        if (!VALID_OPERATORS.includes(operator as FilterOperator)) {
          throw new BadRequestException(
            `Invalid operator '${operator}'. Valid operators: ${VALID_OPERATORS.join(', ')}`
          );
        }

        // Validar campo
        this.validateField(field);

        // Agregar filtro
        if (!filters[field]) {
          filters[field] = {};
        }
        (filters[field] as FieldFilter)[operator as FilterOperator] = this.parseValue(value, operator as FilterOperator);
      } else {
        // Sin operador explícito - usar eq por defecto
        this.validateField(key);
        filters[key] = { eq: this.parseValue(value, 'eq') };
      }
    }

    return filters;
  }

  /**
   * Valida que un campo sea permitido y no esté prohibido
   */
  private validateField(field: string): void {
    // Verificar blacklist
    if (this.options.forbiddenFields.includes(field)) {
      throw new BadRequestException(`Field '${field}' is not allowed for filtering`);
    }

    // Verificar whitelist (solo si está definida)
    if (this.options.allowedFields.length > 0 && !this.options.allowedFields.includes(field)) {
      throw new BadRequestException(
        `Field '${field}' is not allowed for filtering. Allowed fields: ${this.options.allowedFields.join(', ')}`
      );
    }
  }

  /**
   * Parsea el valor según el operador
   */
  private parseValue(value: string, operator: FilterOperator): unknown {
    switch (operator) {
      case 'in':
      case 'nin':
        // Array separado por comas
        return value.split(',').map(v => v.trim()).filter(v => v.length > 0);

      case 'is':
        // Manejar NULL
        if (value.toLowerCase() === 'null') return null;
        if (value.toLowerCase() === 'not_null' || value.toLowerCase() === 'notnull') {
          return { not: null };
        }
        return value;

      case 'eq':
      case 'ne':
        // Intentar parsear booleanos
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;

        // Intentar parsear números
        if (/^-?\d+$/.test(value)) return parseInt(value, 10);
        if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

        return value;

      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
        // Intentar parsear como número o fecha ISO
        if (/^-?\d+$/.test(value)) return parseInt(value, 10);
        if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

        // Intentar parsear fecha ISO
        const date = Date.parse(value);
        if (!isNaN(date)) return new Date(value);

        return value;

      default:
        return value;
    }
  }
}

/**
 * Factory function para crear el pipe con opciones personalizadas
 */
export function createQueryParser(options?: QueryParserOptions): QueryParserPipe {
  return new QueryParserPipe(options);
}
