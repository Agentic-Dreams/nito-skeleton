/**
 * Plopfile.js — Generador de módulos NestJS + Drizzle ORM
 *
 * Uso:
 *   npx plop                          → interactive mode
 *   npx plop module -- entities/reserva.entity.json   → non-interactive
 *
 * Lee un archivo JSON con la definición de la entidad y genera:
 *   src/<entity>/
 *     dto/create-<entity>.dto.ts
 *     dto/update-<entity>.dto.ts
 *     <entity>.controller.ts
 *     <entity>.service.ts
 *     <entity>.module.ts
 *     <entity>.service.spec.ts
 *   src/db/schema/<entity>.schema.ts
 */

const path = require('path');
const fs   = require('fs');

// ─── Type mapping tables ──────────────────────────────────────────────────────

/** Maps entity JSON type → TypeScript type */
const TS_TYPE_MAP = {
  uuid:      'string',
  string:    'string',
  text:      'string',
  integer:   'number',
  boolean:   'boolean',
  date:      'string',
  timestamp: 'Date',
  decimal:   'number',
  json:      'Record<string, unknown>',
};

/** Maps entity JSON type → class-validator decorator name (without @) */
const VALIDATOR_MAP = {
  uuid:      'IsUUID',
  string:    'IsString',
  text:      'IsString',
  integer:   'IsInt',
  boolean:   'IsBoolean',
  date:      'IsDateString',
  timestamp: 'IsDateString',
  decimal:   'IsNumber',
  json:      'IsObject',
};

/** Maps entity JSON type → Drizzle column function name */
const DRIZZLE_FN_MAP = {
  uuid:      'uuid',
  string:    'varchar',
  text:      'text',
  integer:   'integer',
  boolean:   'boolean',
  date:      'date',
  timestamp: 'timestamp',
  decimal:   'decimal',
  json:      'jsonb',
};

/** Maps entity JSON type → Swagger 'type' string */
const SWAGGER_TYPE_MAP = {
  uuid:      'string',
  string:    'string',
  text:      'string',
  integer:   'number',
  boolean:   'boolean',
  date:      'string',
  timestamp: 'string',
  decimal:   'number',
  json:      'object',
};

// ─── String case helpers (used for preprocessing, not in templates) ───────────

function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, c => c.toUpperCase());
}

function toCamelCase(str) {
  const p = toPascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function toSnakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

// ─── Preprocessing helpers ────────────────────────────────────────────────────

/**
 * Formats an example value so it can be placed directly inside
 * a TypeScript source file (strings get single-quoted, primitives are raw).
 */
function formatExample(value) {
  if (typeof value === 'string') return `'${value}'`;
  return String(value);
}

/**
 * Builds the Drizzle column definition expression for a field.
 * e.g.  uuid('id').primaryKey().defaultRandom()
 *       varchar('name', { length: 255 }).notNull()
 */
function buildDrizzleColDef(field) {
  const fn      = DRIZZLE_FN_MAP[field.type] || 'varchar';
  const colName = toSnakeCase(field.name);

  let def = `${fn}('${colName}'`;
  if (field.type === 'string') def += `, { length: ${field.length || 255} }`;
  def += ')';

  if (field.isPrimary) {
    def += '.primaryKey().defaultRandom()';
  } else {
    if (field.default !== undefined) def += `.default(${field.default})`;
    if (field.required)              def += '.notNull()';
  }

  return def;
}

// Auto-generated columns that should NOT appear in DTOs
const AUTO_FIELDS = ['id', 'createdAt', 'updatedAt'];

/**
 * Transforms the raw entity JSON into template-ready data.
 *
 * Adds to every field:
 *   isDtoField      – boolean, excluded from DTOs when true
 *   tsType          – TypeScript type string
 *   swaggerType     – Swagger 'type' string
 *   drizzleColDef   – Full Drizzle column expression
 *   validators      – Array of decorator strings, e.g. ['@IsOptional()', '@IsString()']
 *   isOptional      – boolean (drives the '?' in DTO property)
 *   exampleStr      – example formatted for TS source, or 'undefined'
 *   hasExample      – boolean
 *
 * Adds to the entity:
 *   dtoFields            – filtered list of fields for DTOs
 *   validatorImports     – comma-separated class-validator names
 *   drizzleImports       – comma-separated drizzle-orm/pg-core names
 *   filterConfigString   – JSON string for FilterConfig.stringFields
 *   filterConfigDate     – JSON string for FilterConfig.dateFields
 *   kebabName / camelName / pascalName
 */
function preprocessEntity(entity) {
  const stringFieldNames = [];
  const dateFieldNames   = [];

  const allFields = entity.fields.map(field => {
    const isAuto     = AUTO_FIELDS.includes(field.name);
    const isDtoField = !isAuto;
    const isOptional = !field.required && !field.isPrimary;

    // Build validator decorator lines for this field
    const validators = [];
    if (isDtoField) {
      if (isOptional) validators.push('@IsOptional()');
      validators.push(`@${VALIDATOR_MAP[field.type] || 'IsString'}()`);
    }

    // Accumulate fields for FilterConfig
    if (isDtoField) {
      if (['string', 'text', 'uuid'].includes(field.type)) stringFieldNames.push(field.name);
      if (['date', 'timestamp'].includes(field.type))       dateFieldNames.push(field.name);
    }

    return {
      ...field,
      isAuto,
      isDtoField,
      isOptional,
      tsType:        TS_TYPE_MAP[field.type]      || 'string',
      swaggerType:   SWAGGER_TYPE_MAP[field.type]  || 'string',
      drizzleColDef: buildDrizzleColDef(field),
      validators,
      exampleStr:    field.example !== undefined ? formatExample(field.example) : 'undefined',
      hasExample:    field.example !== undefined,
      description:   field.description || `${field.name} field`,
    };
  });

  const dtoFields = allFields.filter(f => f.isDtoField);

  // ── Compute import lists ──────────────────────────────────────────────────

  // class-validator imports
  const validatorSet = new Set();
  dtoFields.forEach(f => {
    if (f.isOptional) validatorSet.add('IsOptional');
    validatorSet.add(VALIDATOR_MAP[f.type] || 'IsString');
  });

  // drizzle-orm/pg-core imports (schema template)
  const drizzleSet = new Set(['pgTable', 'uuid', 'timestamp', 'index']);
  allFields.forEach(f => {
    const fn = DRIZZLE_FN_MAP[f.type];
    if (fn) drizzleSet.add(fn);
  });

  // ── Name variants (used for path templating in plopfile actions) ──────────
  const kebabName  = toKebabCase(entity.name);
  const camelName  = toCamelCase(entity.name);
  const pascalName = toPascalCase(entity.name);

  return {
    ...entity,
    allFields,
    dtoFields,
    validatorImports:    [...validatorSet].join(', '),
    drizzleImports:      [...drizzleSet].join(', '),
    filterConfigString:  JSON.stringify(stringFieldNames),
    filterConfigDate:    JSON.stringify(dateFieldNames),
    kebabName,
    camelName,
    pascalName,
    // Convenience: entity.name kept as-is (original casing from JSON)
  };
}

// ─── Plop configuration ───────────────────────────────────────────────────────

module.exports = function (plop) {
  // Extra Handlebars helpers (Plop already ships camelCase, pascalCase, kebabCase, etc.)
  plop.setHelper('eq',  (a, b)  => a === b);
  plop.setHelper('ne',  (a, b)  => a !== b);
  plop.setHelper('not', (val)   => !val);
  plop.setHelper('or',  (a, b)  => a || b);

  plop.setGenerator('module', {
    description: 'Generate a complete NestJS + Drizzle module from an entity JSON definition',

    prompts: [
      {
        type:    'input',
        name:    'entityJsonPath',
        message: 'Path to entity JSON file (relative to project root):',
        default: 'entities/example.entity.json',
      },
    ],

    actions(data) {
      // ── Read & preprocess ────────────────────────────────────────────────
      const jsonPath = path.resolve(process.cwd(), data.entityJsonPath);

      if (!fs.existsSync(jsonPath)) {
        throw new Error(`Entity JSON not found: ${jsonPath}`);
      }

      const entity = preprocessEntity(
        JSON.parse(fs.readFileSync(jsonPath, 'utf-8')),
      );

      /**
       * Merge entity data into `data` so that Plop can resolve
       * {{kebabCase name}}, {{pascalCase name}}, etc. inside `path` strings.
       */
      Object.assign(data, entity);

      const dest = 'src/{{kebabCase name}}';

      return [
        // ── DTOs ────────────────────────────────────────────────────────
        {
          type:         'add',
          path:         `${dest}/dto/create-{{kebabCase name}}.dto.ts`,
          templateFile: 'plop-templates/create-dto.hbs',
          data:         entity,
        },
        {
          type:         'add',
          path:         `${dest}/dto/update-{{kebabCase name}}.dto.ts`,
          templateFile: 'plop-templates/update-dto.hbs',
          data:         entity,
        },
        // ── Core module files ────────────────────────────────────────────
        {
          type:         'add',
          path:         `${dest}/{{kebabCase name}}.controller.ts`,
          templateFile: 'plop-templates/controller.hbs',
          data:         entity,
        },
        {
          type:         'add',
          path:         `${dest}/{{kebabCase name}}.service.ts`,
          templateFile: 'plop-templates/service.hbs',
          data:         entity,
        },
        {
          type:         'add',
          path:         `${dest}/{{kebabCase name}}.module.ts`,
          templateFile: 'plop-templates/module.hbs',
          data:         entity,
        },
        // ── Tests ────────────────────────────────────────────────────────
        {
          type:         'add',
          path:         `${dest}/{{kebabCase name}}.service.spec.ts`,
          templateFile: 'plop-templates/spec.hbs',
          data:         entity,
        },
        // ── DB Schema ────────────────────────────────────────────────────
        {
          type:         'add',
          path:         'src/db/schema/{{kebabCase name}}.schema.ts',
          templateFile: 'plop-templates/schema.hbs',
          data:         entity,
        },
      ];
    },
  });
};
