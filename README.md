# Nito Skeleton

> NestJS production-ready skeleton — arranca un proyecto backend en minutos, no en días.

## Stack tecnológico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| **Framework** | [NestJS](https://nestjs.com) v10 | Arquitectura modular, DI nativa, decoradores TypeScript |
| **HTTP Server** | [Fastify](https://fastify.dev) v4 | ~2× más rápido que Express, mejor throughput en prod |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team) | Type-safe SQL sin magia, migraciones explícitas |
| **Base de datos** | PostgreSQL 14+ | RLS nativo, transacciones ACID, JSONB |
| **Autenticación** | JWT + bcrypt | Stateless, estándar del sector |
| **Validación** | class-validator + class-transformer | Decoradores declarativos en DTOs |
| **Docs API** | Swagger / OpenAPI | Auto-generado desde decoradores |
| **Logging** | Winston (JSON) | Compatible con Grafana/Loki out of the box |
| **Testing** | Jest + @nestjs/testing | Unitarios y E2E incluidos |
| **Contenedor** | Docker multi-stage | Imagen production optimizada |

### Incluido desde el primer momento

| Feature | Descripción |
|---------|-------------|
| 🔐 **JWT Auth** | Login, registro, guards listos |
| 🔒 **RLS (Row Level Security)** | Aislamiento de datos por usuario a nivel PostgreSQL |
| 🔍 **Filtros dinámicos** | Query parser universal: `?campo[operador]=valor` |
| 📄 **Paginación** | Helper `paginate()` con metadata completa |
| 🪪 **Request ID** | `X-Request-ID` en cada request para trazabilidad |
| 🛡️ **Guards y Roles** | `@Roles('ADMIN')`, `@UseRls()`, `JwtAuthGuard` listos |
| 📊 **Health checks** | `/health` endpoint con Terminus |
| 🏗️ **Generador de módulos** | `npm run generate` — CRUD completo desde un JSON |
| 🌍 **Env validation** | Variables validadas con Joi al arrancar |

---

## Crear un proyecto nuevo

### Opción A — GitHub Template (recomendado)

En GitHub, haz clic en **"Use this template"** → **"Create a new repository"**.

O via CLI con `gh`:
```bash
gh repo create mi-proyecto --template Agentic-Dreams/nito-skeleton --private
cd mi-proyecto
npm install
cp .env.example .env
```

### Opción B — degit (sin ir a GitHub)

```bash
npx degit Agentic-Dreams/nito-skeleton mi-proyecto
cd mi-proyecto
npm install
cp .env.example .env
```

### Opción C — Script interactivo

```bash
# Desde el skeleton clonado localmente:
npm run create mi-proyecto
```

El script hace automáticamente:
- Clona el skeleton sin historial git
- Renombra el proyecto en `package.json`
- Genera un `JWT_SECRET` aleatorio seguro
- Crea `.env` desde `.env.example`
- Inicializa un repositorio git limpio
- Ejecuta `npm install`

---

## Setup manual (post-clonación)

### 1. Variables de entorno

```bash
cp .env.example .env
# Edita .env con tus valores reales
```

Variables obligatorias:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://user:pass@localhost:5432/mydb` |
| `JWT_SECRET` | Secreto JWT (mín. 32 chars) | genera con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `FRONTEND_URL` | URL del frontend (CORS) | `http://localhost:5173` |

### 2. Base de datos

```bash
# Con Docker
docker-compose up -d db

# O PostgreSQL local
createdb nito_dev

# Migraciones
npm run db:migrate
```

### 3. Arrancar

```bash
npm run start:dev   # desarrollo con hot-reload
```

Visita `http://localhost:3000/api/docs` para Swagger.

---

## Generar un módulo CRUD completo

```bash
npm run generate
```

Lee un JSON de definición de entidad y genera 7 archivos listos para producción:

| Archivo | Descripción |
|---------|-------------|
| `dto/create-<entity>.dto.ts` | DTO con validaciones y Swagger exhaustivo |
| `dto/update-<entity>.dto.ts` | DTO parcial (PartialType) |
| `<entity>.controller.ts` | CRUD REST con Swagger, filtros, paginación |
| `<entity>.service.ts` | Servicio con RLS + filtros dinámicos |
| `<entity>.module.ts` | Módulo NestJS |
| `<entity>.service.spec.ts` | Tests unitarios (9 casos base) |
| `database/schema/<entity>.schema.ts` | Schema Drizzle con tipos inferidos |

### Definición de entidad

```json
{
  "name": "Producto",
  "tableName": "productos",
  "fields": [
    { "name": "id",        "type": "uuid",    "isPrimary": true },
    { "name": "nombre",    "type": "string",  "required": true,  "example": "Camiseta", "description": "Nombre del producto" },
    { "name": "precio",    "type": "decimal", "required": true,  "example": 29.99 },
    { "name": "activo",    "type": "boolean", "required": false, "example": true },
    { "name": "createdAt", "type": "timestamp" },
    { "name": "updatedAt", "type": "timestamp" }
  ]
}
```

Tipos: `uuid` · `string` · `text` · `integer` · `boolean` · `date` · `timestamp` · `decimal` · `json`

Ver `docs/CODEGEN.md` para referencia completa.

**Paso manual tras la generación:** añadir el schema al índice:
```typescript
// src/database/schema/index.ts
export * from './producto.schema';
```

---

## Filtros dinámicos

Todos los `GET /` generados aceptan filtros con notación de corchetes:

```bash
GET /productos?nombre[ilike]=%camiseta%
GET /productos?precio[gte]=10&precio[lte]=50
GET /productos?activo[eq]=true&page=2&limit=25
GET /productos?createdAt[gte]=2026-01-01&sortBy=nombre&sortOrder=asc
```

Operadores: `eq` `ne` `gt` `gte` `lt` `lte` `like` `ilike` `in` `nin` `is` `startsWith` `endsWith`

Ver `docs/IMPLEMENTATION_GUIDE.md` para documentación completa.

---

## Row Level Security (RLS)

Aislamiento de datos a nivel de base de datos, sin lógica manual en cada query:

```typescript
@Controller('mis-pedidos')
@UseGuards(JwtAuthGuard)
@UseRls()                        // activa RLS para todo el controller
export class MisPedidosController {
  @Get()
  findAll(@CurrentUser() user: JwtUser) {
    return this.service.findAll(user);  // PostgreSQL filtra por usuario automáticamente
  }
}
```

PostgreSQL recibe `app.current_user_id` y `app.current_user_role` en cada transacción vía `SET LOCAL`.

---

## Estructura del proyecto

```
├── bin/
│   └── create-nito-app.mjs     # Bootstrap de nuevos proyectos
├── docs/
│   ├── CODEGEN.md              # Generador de módulos
│   ├── IMPLEMENTATION_GUIDE.md # Filtros dinámicos y RLS
│   └── LOGS_GRAFANA.md         # Logs para Grafana/Loki
├── entities/
│   └── example.entity.json     # Entidad de ejemplo
├── plop-templates/             # Plantillas Handlebars
├── src/
│   ├── auth/                   # JWT: login, registro, guards, decoradores
│   ├── common/
│   │   ├── decorators/         # @QueryParser(), @UseRls()
│   │   ├── filters/            # GlobalExceptionFilter
│   │   ├── interceptors/       # LoggingInterceptor
│   │   ├── middleware/         # RequestIdMiddleware (X-Request-ID)
│   │   ├── pipes/              # QueryParserPipe
│   │   ├── types/              # ParsedQuery, PaginatedResponse
│   │   └── utils/              # buildWhereClause(), paginate()
│   ├── config/                 # Validación de env vars (Joi)
│   ├── database/
│   │   ├── schema/             # Tablas Drizzle
│   │   ├── types/              # RlsContext, RlsTransactionCallback
│   │   ├── rls.interceptor.ts  # Interceptor RLS global
│   │   └── rls.service.ts      # execute() — transacciones RLS
│   ├── health/                 # /health (Terminus)
│   ├── app.module.ts
│   └── main.ts
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── plopfile.js
```

---

## Testing

```bash
npm test              # unitarios
npm run test:watch    # modo watch
npm run test:cov      # cobertura
npm run test:e2e      # E2E
```

---

## Docker

```bash
docker build -t mi-app .
docker run -p 3000:3000 --env-file .env mi-app

# Con docker-compose (incluye PostgreSQL)
docker-compose up -d
```

---

## Logging

Logs JSON estructurados compatibles con Grafana/Loki. Cada request incluye `requestId` para trazabilidad end-to-end. Ver `docs/LOGS_GRAFANA.md`.

---

## Licencia

MIT
