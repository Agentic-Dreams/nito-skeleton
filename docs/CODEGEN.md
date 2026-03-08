# Code Generator — Model-Driven Development

Sistema de autogeneración de módulos NestJS + Drizzle ORM basado en definiciones JSON.

## Arquitectura

```
plopfile.js              ← Script generador (Plop.js)
plop-templates/          ← Plantillas Handlebars
  create-dto.hbs
  update-dto.hbs
  controller.hbs
  service.hbs
  module.hbs
  spec.hbs
  schema.hbs
entities/                ← Definiciones de entidades (fuente de verdad)
  example.entity.json
```

## Uso

```bash
# Modo interactivo
npm run generate

# Non-interactive (pasa el path como argumento)
npx plop module -- entities/mi-entidad.entity.json
```

## Formato del JSON de entidad

```json
{
  "name": "NombreEntidad",        // PascalCase — se usa para nombres de clase
  "tableName": "nombre_tabla",    // snake_case — nombre real en PostgreSQL
  "fields": [
    {
      "name": "id",               // camelCase — se convierte a snake_case en DB
      "type": "uuid",             // Ver tabla de tipos abajo
      "isPrimary": true           // Solo para el PK; genera .primaryKey().defaultRandom()
    },
    {
      "name": "miCampo",
      "type": "string",
      "required": true,           // false → @IsOptional() + '?' en TypeScript
      "default": "'valor'",       // Literal SQL para Drizzle .default()
      "length": 100,              // Solo para type: "string" (varchar). Default: 255
      "description": "...",       // @ApiProperty description
      "example": "valorEjemplo"   // @ApiProperty example
    },
    {
      "name": "createdAt",        // Campos auto: id, createdAt, updatedAt
      "type": "timestamp"         // Se excluyen de los DTOs automáticamente
    }
  ]
}
```

## Tabla de tipos soportados

| JSON type   | TypeScript  | Drizzle fn  | Swagger type | Validator       |
|-------------|-------------|-------------|--------------|-----------------|
| `uuid`      | `string`    | `uuid()`    | `string`     | `@IsUUID()`     |
| `string`    | `string`    | `varchar()` | `string`     | `@IsString()`   |
| `text`      | `string`    | `text()`    | `string`     | `@IsString()`   |
| `integer`   | `number`    | `integer()` | `number`     | `@IsInt()`      |
| `boolean`   | `boolean`   | `boolean()` | `boolean`    | `@IsBoolean()`  |
| `date`      | `string`    | `date()`    | `string`     | `@IsDateString()`|
| `timestamp` | `Date`      | `timestamp()`| `string`    | `@IsDateString()`|
| `decimal`   | `number`    | `decimal()` | `number`     | `@IsNumber()`   |
| `json`      | `Record<string, unknown>` | `jsonb()` | `object` | `@IsObject()` |

## Archivos generados por ejecución

| Archivo                                    | Descripción                                  |
|--------------------------------------------|----------------------------------------------|
| `src/<entity>/dto/create-<entity>.dto.ts`  | DTO de creación con Swagger + class-validator |
| `src/<entity>/dto/update-<entity>.dto.ts`  | DTO de actualización (PartialType del create) |
| `src/<entity>/<entity>.controller.ts`      | CRUD REST con Swagger exhaustivo              |
| `src/<entity>/<entity>.service.ts`         | Servicio con RLS, filtros dinámicos, paginación |
| `src/<entity>/<entity>.module.ts`          | Módulo NestJS estándar                        |
| `src/<entity>/<entity>.service.spec.ts`    | Tests unitarios con mocks de Drizzle          |
| `src/db/schema/<entity>.schema.ts`         | Schema Drizzle (pgTable) con tipos inferidos  |

## Proceso post-generación (pasos manuales)

1. **Revisar el schema** en `src/db/schema/<entity>.schema.ts`:
   - Añadir FK constraints (`.references(() => otherTable.id)`)
   - Ajustar índices
   - Si hay enums, considera `pgEnum()` en lugar de `varchar`

2. **Crear la migración**: `npm run db:generate`

3. **Ejecutar la migración**: `npm run db:migrate` (o `db:push` en desarrollo)

4. **Registrar el schema** en `src/db/schema/index.ts`

5. **Importar el módulo** en `app.module.ts`

6. **Personalizar el servicio** si la entidad necesita lógica de negocio extra:
   - Máquinas de estado (transiciones de status)
   - Validaciones de negocio custom
   - Hooks antes/después de guardar

7. **Completar los tests** en `*.service.spec.ts`:
   - Rellenar los objetos DTO con datos válidos
   - Añadir casos de error específicos de la entidad

## Notas de diseño

### Preprocesamiento en plopfile.js
Todo el mapeo de tipos (TypeScript, Drizzle, Swagger, class-validator) ocurre en
`plopfile.js → preprocessEntity()`. Las plantillas `.hbs` reciben datos ya resueltos,
lo que las hace simples y fáciles de leer/modificar.

### Campos auto-generados
`id`, `createdAt`, `updatedAt` se excluyen de los DTOs automáticamente.
Se detectan por nombre; si usas nombres distintos, ajusta `AUTO_FIELDS` en `plopfile.js`.

### FilterConfig del servicio
`preprocessEntity()` infiere automáticamente qué campos van en `stringFields`
y `dateFields` del `FilterConfig` del servicio, en función del tipo del campo.

### Update DTO
Usa `PartialType(CreateDto)` de `@nestjs/swagger` para heredar todas las propiedades
de Swagger y hacer todos los campos opcionales. Añade manualmente campos extra como
transiciones de estado si la entidad los necesita.

## Estado de implementación

- [x] `plopfile.js` — Script generador con preprocesamiento completo
- [x] `create-dto.hbs` — DTO de creación
- [x] `update-dto.hbs` — DTO de actualización (PartialType)
- [x] `controller.hbs` — Controlador REST con Swagger exhaustivo
- [x] `service.hbs` — Servicio con RLS + filtros dinámicos + paginación
- [x] `module.hbs` — Módulo NestJS
- [x] `spec.hbs` — Tests unitarios base
- [x] `schema.hbs` — Schema Drizzle
- [x] `entities/example.entity.json` — Entidad de ejemplo (Reserva)
