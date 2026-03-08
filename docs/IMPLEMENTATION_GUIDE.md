# Guía de Implementación - Filtros y RLS

Esta guía documenta la implementación del sistema de filtros dinámicos y RLS seguro con transacciones.

## 📁 Estructura de Archivos Creados

```
src/
├── common/
│   ├── types/
│   │   ├── query.types.ts        # Tipos para filtros y paginación
│   │   └── index.ts
│   ├── pipes/
│   │   ├── query-parser.pipe.ts  # Pipe universal para query params
│   │   └── index.ts
│   ├── utils/
│   │   ├── filter-builder.util.ts # Builder de filtros para Drizzle
│   │   ├── paginate.util.ts       # Helper de paginación
│   │   └── index.ts
│   ├── decorators/
│   │   ├── parsed-query.decorator.ts  # @ParsedQuery()
│   │   ├── use-rls.decorator.ts       # @UseRls()
│   │   └── index.ts
│   └── index.ts
├── database/
│   ├── types/
│   │   ├── rls.types.ts          # Tipos para RLS
│   │   └── index.ts
│   ├── rls.service.ts            # Servicio para transacciones RLS
│   └── rls.interceptor.v2.ts     # Interceptor RLS v2
└── dogs/
    ├── dto/
    │   └── dog-list-response.dto.ts  # DTO de respuesta paginada
    ├── dogs.service.v2.ts        # Ejemplo con filtros
    ├── dogs.service.v3.ts        # Ejemplo con filtros + RLS
    └── dogs.controller.v2.ts     # Ejemplo con QueryParserPipe
```

---

## 🚀 Fase 1: Utilidades Core (Filtros + Paginación)

### 1.1 QueryParserPipe

Convierte query parameters con notación de corchetes a filtros estructurados.

**Operadores soportados:**
- `[eq]` - Igual (=)
- `[ne]` - No igual (!=)
- `[gt]`, `[gte]` - Mayor que / Mayor o igual
- `[lt]`, `[lte]` - Menor que / Menor o igual
- `[like]` - LIKE pattern (case-sensitive)
- `[ilike]` - ILIKE pattern (case-insensitive) ⭐
- `[in]` - En array (valores separados por coma)
- `[is]` - IS NULL (valor: 'null')

**Uso básico:**

```typescript
@Get()
@UsePipes(createQueryParser({
  allowedFields: ['name', 'breed', 'size', 'age'],
  allowedSortFields: ['name', 'createdAt'],
  maxLimit: 100,
  defaultLimit: 10,
}))
async findAll(@ParsedQuery() query: ParsedQuery) {
  return this.service.findAll(query);
}
```

**Ejemplos de URLs:**
```
GET /dogs?name[ilike]=%max%&age[gte]=2
GET /dogs?size[in]=small,medium&isActive[eq]=true
GET /dogs?page=2&limit=20&sortBy=name&sortOrder=asc
GET /dogs?breed[eq]=Labrador&color[ilike]=%brown%
```

### 1.2 Filter Builder

Construye condiciones SQL de Drizzle a partir de filtros parseados.

```typescript
import { buildWhereClause, FilterConfig } from '../common/utils';

const DOGS_FILTER_CONFIG: FilterConfig<typeof dogs> = {
  stringFields: ['name', 'breed', 'color'],
  numberFields: ['age'],
  booleanFields: ['isActive'],
  enumFields: { size: ['small', 'medium', 'large'] },
};

const whereClause = buildWhereClause(filters, dogs, DOGS_FILTER_CONFIG);
const results = await db.select().from(dogs).where(whereClause);
```

### 1.3 Paginate Utility

Ejecuta queries paginadas con conteo total.

```typescript
import { paginate } from '../common/utils';

const result = await paginate(
  db.select().from(dogs).where(whereClause),  // Query de datos
  db.select({ count: sql<number>`count(*)` }).from(dogs).where(whereClause),  // Query de conteo
  { page: 1, limit: 10, skip: 0, take: 10 }   // Parámetros de paginación
);

// Resultado:
// {
//   data: [...],
//   meta: {
//     total: 50,
//     page: 1,
//     limit: 10,
//     lastPage: 5,
//     hasNextPage: true,
//     hasPreviousPage: false
//   }
// }
```

---

## 🔒 Fase 2: RLS Seguro con Transacciones

### 2.1 Arquitectura del Sistema RLS

```
Request con JWT
      ↓
JwtAuthGuard (valida token)
      ↓
RlsInterceptorV2 (marca contexto)
      ↓
Controller (recibe user + contexto RLS)
      ↓
RlsService.execute() (transacción segura)
      ↓
PostgreSQL con RLS habilitado
```

### 2.2 RlsService

Ejecuta queries dentro de transacciones con contexto RLS.

```typescript
@Injectable()
export class MyService {
  constructor(private readonly rlsService: RlsService) {}

  async findAll(user: JwtUser) {
    return this.rlsService.execute(user, async (tx, context) => {
      // Todas las queries aquí usan el contexto RLS
      return tx.select().from(dogs).where(eq(dogs.isActive, true));
    });
  }
}
```

**Ventajas del enfoque por transacción:**
1. ✅ Variables RLS son locales a la transacción (`SET LOCAL`)
2. ✅ Sin fugas de contexto entre conexiones del pool
3. ✅ Rollback automático si hay errores
4. ✅ Compatible con políticas RLS de PostgreSQL

### 2.3 Marcado de Rutas con @UseRls()

```typescript
// Todas las rutas del controlador usan RLS
@Controller('dogs')
@UseRls()
export class DogsController {
  constructor(private readonly service: MyService) {}

  // Esta ruta usará RLS
  @Get()
  findAll(@CurrentUser() user: JwtUser) {
    return this.service.findAll(user);
  }
}

// O solo rutas específicas
@Controller('public')
export class PublicController {
  // Sin RLS - ruta pública
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // Con RLS - ruta protegida
  @Get('profile')
  @UseRls()
  profile(@CurrentUser() user: JwtUser) {
    return this.service.getProfile(user);
  }
}
```

### 2.4 Configuración en AppModule

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RlsInterceptorV2 } from './database/rls.interceptor.v2';
import { RlsService } from './database/rls.service';

@Module({
  providers: [
    RlsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RlsInterceptorV2,
    },
  ],
})
export class AppModule {}
```

---

## 📋 Migración por Pasos

### Paso 1: Actualizar módulos existentes

Para migrar un módulo existente (ej. `DogsModule`):

1. **Actualizar el Service:**
```typescript
// Antes
@Injectable()
export class DogsService {
  constructor(@Inject('DRIZZLE') private readonly db: NodePgDatabase) {}
  
  async findAll(userId, userRole) {
    // Lógica manual de filtrado
  }
}

// Después
@Injectable()
export class DogsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: NodePgDatabase,
    private readonly rlsService: RlsService,  // Inyectar RlsService
  ) {}
  
  async findAll(user: JwtUser, query: ParsedQuery) {
    return this.rlsService.execute(user, async (tx) => {
      // Usar tx en lugar de this.db
      // El RLS filtra automáticamente
    });
  }
}
```

2. **Actualizar el Controller:**
```typescript
// Antes
@Get()
async findAll(
  @CurrentUser() user: JwtUser,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  return this.service.findAll(user.userId, user.role, page, limit);
}

// Después
@Get()
@UseRls()  // Marcar con @UseRls()
@UsePipes(createQueryParser({
  allowedFields: ['name', 'breed', 'size', 'age'],
}))
async findAll(
  @CurrentUser() user: JwtUser,
  @ParsedQuery() query: ParsedQuery,  // Usar @ParsedQuery()
) {
  return this.service.findAll(user, query);
}
```

3. **Actualizar el Module:**
```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [DogsController],
  providers: [
    DogsService,
    RlsService,  // Añadir RlsService
  ],
})
export class DogsModule {}
```

---

## 🔧 Configuración de Políticas RLS en PostgreSQL

Las políticas RLS deben estar configuradas en la base de datos:

```sql
-- Habilitar RLS en la tabla
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuarios ven solo sus perros
CREATE POLICY dogs_select_policy ON dogs
  FOR SELECT
  USING (
    customer_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'ADMIN'
  );

-- Política para INSERT: usuarios solo insertan para sí mismos
CREATE POLICY dogs_insert_policy ON dogs
  FOR INSERT
  WITH CHECK (
    customer_id = current_setting('app.current_user_id', true)::uuid
  );

-- Política para UPDATE: usuarios solo actualizan sus perros
CREATE POLICY dogs_update_policy ON dogs
  FOR UPDATE
  USING (
    customer_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'ADMIN'
  );

-- Política para DELETE: soft delete (actualización)
CREATE POLICY dogs_delete_policy ON dogs
  FOR DELETE
  USING (
    customer_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.current_user_role', true) = 'ADMIN'
  );
```

---

## ✅ Checklist de Implementación

### Para cada módulo a migrar:

- [ ] Actualizar Service para usar `RlsService.execute()`
- [ ] Actualizar Controller con `@UseRls()` y `@UsePipes(createQueryParser())`
- [ ] Usar `@ParsedQuery()` para recibir los filtros
- [ ] Añadir `RlsService` a los providers del módulo
- [ ] Actualizar DTOs de respuesta para incluir metadatos de paginación
- [ ] Probar filtros con diferentes operadores
- [ ] Verificar que RLS funciona correctamente (usuarios solo ven sus datos)

### Configuración global:

- [ ] Añadir `RlsInterceptorV2` como interceptor global
- [ ] Añadir `RlsService` a los providers globales
- [ ] Verificar políticas RLS en PostgreSQL
- [ ] Probar rutas públicas (sin @UseRls()) funcionan correctamente
