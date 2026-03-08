/**
 * Decorador para marcar rutas o controladores que usan RLS
 *
 * Uso en controller:
 * ```typescript
 * @Controller('dogs')
 * @UseRls()  // Todas las rutas usan RLS
 * export class DogsController {}
 * ```
 *
 * Uso en método específico:
 * ```typescript
 * @Get()
 * @UseRls()  // Solo esta ruta usa RLS
 * findAll() {}
 * ```
 *
 * Para rutas públicas (sin autenticación), no usar @UseRls()
 */

import { SetMetadata } from '@nestjs/common';

export const USE_RLS_KEY = 'useRls';

export const UseRls = () => SetMetadata(USE_RLS_KEY, true);
