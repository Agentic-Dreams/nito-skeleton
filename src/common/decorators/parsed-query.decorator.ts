/**
 * Decorador para inyectar la query parseada en los controladores
 *
 * Uso:
 * ```typescript
 * @Get()
 * async findAll(@QueryParser() query: ParsedQueryResult) {
 *   return this.service.findAll(query);
 * }
 * ```
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ParsedQuery as ParsedQueryType } from '../types/query.types';

export const QueryParser = createParamDecorator(
  (data: keyof ParsedQueryType | undefined, ctx: ExecutionContext): ParsedQueryType | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const parsedQuery = request.parsedQuery as ParsedQueryType;

    if (!parsedQuery) {
      throw new Error(
        'ParsedQuery not found in request. Make sure to use QueryParserPipe in your route.'
      );
    }

    return data ? parsedQuery[data] : parsedQuery;
  },
);

// Re-exportar el tipo con un nombre diferente para evitar conflictos
export type { ParsedQuery as ParsedQueryType } from '../types/query.types';
