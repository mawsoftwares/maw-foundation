#!/usr/bin/env node
// -----------------------------------------------------------------------------
// Module Generator — scaffolds a complete CRUD module (backend + frontend)
// from a JSON spec, following maw-foundation's existing conventions exactly
// (Drizzle+Postgres flat routes like modules/orders + menu-routes.ts,
// Action_Module RBAC permissions, RTK Query on the frontend per the Users
// module reference). Plain Node/ESM, no build step — run with:
//
//   node scripts/generate-module.mjs module-specs/customer.json
//
// It writes real, editable source files (schema, migration, permission
// module, routes, RTK Query slice, list/form/detail UI) and then wires them
// into the existing registries (schema/index.ts, modules/index.ts, main.ts,
// store/index.ts, App.tsx) via small, idempotent anchor-based patches — not
// a runtime plugin system. Once generated, every file is normal code you
// own and can freely diverge from the template; re-running the generator
// for the same module only touches files it originally created (registry
// patches are skipped if already present).
// -----------------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Case helpers
// ---------------------------------------------------------------------------

function toWords(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}
function toPascalCase(input) {
  return toWords(input).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
}
function toCamelCase(input) {
  const pascal = toPascalCase(input);
  return pascal[0].toLowerCase() + pascal.slice(1);
}
function toKebabCase(input) {
  return toWords(input).join('-');
}
function toSnakeCase(input) {
  return toWords(input).join('_');
}
function pluralize(word) {
  if (/[sxz]$/.test(word) || /[^aeiou](ch|sh)$/.test(word)) return word + 'es';
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies';
  if (word.endsWith('s')) return word;
  return word + 's';
}

// ---------------------------------------------------------------------------
// Field type registry — maps a spec field's `type` to a Drizzle column
// builder, a raw SQL column type, a TypeScript type, and which ui-web form
// control the generated Create/Edit form uses.
// ---------------------------------------------------------------------------

const FIELD_TYPES = {
  string:  { drizzle: (col) => `varchar('${col}', { length: 255 })`, sql: 'VARCHAR(255)', ts: 'string', ui: 'text' },
  text:    { drizzle: (col) => `text('${col}')`, sql: 'TEXT', ts: 'string', ui: 'textarea' },
  email:   { drizzle: (col) => `varchar('${col}', { length: 255 })`, sql: 'VARCHAR(255)', ts: 'string', ui: 'text' },
  phone:   { drizzle: (col) => `varchar('${col}', { length: 30 })`, sql: 'VARCHAR(30)', ts: 'string', ui: 'text' },
  number:  { drizzle: (col) => `integer('${col}')`, sql: 'INTEGER', ts: 'number', ui: 'number' },
  decimal: { drizzle: (col) => `numeric('${col}', { precision: 14, scale: 2 })`, sql: 'NUMERIC(14,2)', ts: 'string', ui: 'number' },
  boolean: { drizzle: (col) => `boolean('${col}')`, sql: 'BOOLEAN', ts: 'boolean', ui: 'toggle' },
  date:    { drizzle: (col) => `timestamp('${col}', { withTimezone: true, mode: 'date' })`, sql: 'TIMESTAMPTZ', ts: 'string', ui: 'date' },
  enum:    { drizzle: (col) => `varchar('${col}', { length: 30 })`, sql: 'VARCHAR(30)', ts: 'string', ui: 'select' },
};

// ---------------------------------------------------------------------------
// Spec loading + validation
// ---------------------------------------------------------------------------

function loadSpec(specPath) {
  const raw = readFileSync(resolve(process.cwd(), specPath), 'utf8');
  const spec = JSON.parse(raw);
  if (!spec.name || typeof spec.name !== 'string') {
    throw new Error('Spec must have a string "name" (e.g. "Customer")');
  }
  if (!Array.isArray(spec.fields) || spec.fields.length === 0) {
    throw new Error('Spec must have a non-empty "fields" array');
  }
  for (const f of spec.fields) {
    if (!f.name || !f.type) throw new Error(`Each field needs "name" and "type": ${JSON.stringify(f)}`);
    if (!FIELD_TYPES[f.type]) throw new Error(`Unknown field type "${f.type}" on field "${f.name}". Known types: ${Object.keys(FIELD_TYPES).join(', ')}`);
    if (f.type === 'enum' && (!Array.isArray(f.options) || f.options.length === 0)) {
      throw new Error(`Field "${f.name}" is type "enum" but has no "options" array`);
    }
  }
  return spec;
}

function deriveNames(spec) {
  const singular = spec.name;
  const plural = spec.namePlural || pluralize(singular);
  return {
    pascal: toPascalCase(singular),           // Customer
    camel: toCamelCase(singular),             // customer
    kebab: toKebabCase(singular),             // customer
    snake: toSnakeCase(singular),             // customer
    pluralPascal: toPascalCase(plural),       // Customers
    pluralCamel: toCamelCase(plural),         // customers
    pluralKebab: toKebabCase(plural),         // customers
    pluralSnake: toSnakeCase(plural),         // customers
    pluralLower: toWords(plural).join(' '),   // customers (readable)
  };
}

function derivePermissions(spec, names) {
  const p = spec.permissions || {};
  return {
    view: p.view || `Read_${names.pluralPascal}`,
    create: p.create || `Create_${names.pluralPascal}`,
    update: p.update || `Update_${names.pluralPascal}`,
    delete: p.delete || `Delete_${names.pluralPascal}`,
  };
}

// ---------------------------------------------------------------------------
// Backend: Drizzle schema (packages/database/src/schema/<pluralKebab>.ts)
// ---------------------------------------------------------------------------

function fieldColumnName(field) {
  return toSnakeCase(field.name);
}

function generateSchemaFile(spec, names) {
  const drizzleTypesUsed = new Set(['pgTable', 'uuid', 'text', 'timestamp']);
  const fieldLines = spec.fields.map((f) => {
    const col = fieldColumnName(f);
    const type = FIELD_TYPES[f.type];
    const drizzleFnName = type.drizzle(col).split('(')[0];
    drizzleTypesUsed.add(drizzleFnName);
    let line = `  ${toCamelCase(f.name)}: ${type.drizzle(col)}`;
    if (f.required) line += '.notNull()';
    if (f.default !== undefined) {
      line += typeof f.default === 'string' ? `.default(${JSON.stringify(f.default)})` : `.default(${JSON.stringify(f.default)})`;
    }
    line += ',';
    return line;
  });

  const hasStatusField = spec.fields.some((f) => toCamelCase(f.name) === 'status');

  return `import { ${[...drizzleTypesUsed].sort().join(', ')} } from 'drizzle-orm/pg-core';

// ${names.pascal}: generated by scripts/generate-module.mjs — edit freely,
// this file is not regenerated once created.
export const ${names.pluralCamel} = pgTable('${names.pluralSnake}', {
  id: uuid('id').primaryKey().defaultRandom(),
${fieldLines.join('\n')}
${hasStatusField ? '' : `  status: varchar('status', { length: 20 }).notNull().default('active'),\n`}  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
`;
}

// ---------------------------------------------------------------------------
// Backend: migration SQL
// ---------------------------------------------------------------------------

function nextMigrationNumber() {
  const dir = resolve(ROOT, 'apps/sample-server/migrations');
  const nums = readdirSync(dir)
    .map((f) => f.match(/^(\d+)_/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const max = nums.length ? Math.max(...nums) : 0;
  return String(max + 1).padStart(3, '0');
}

function generateMigrationUpSql(spec, names) {
  const hasStatusField = spec.fields.some((f) => toCamelCase(f.name) === 'status');
  const lines = spec.fields.map((f) => {
    const col = fieldColumnName(f);
    const type = FIELD_TYPES[f.type];
    let line = `  ${col.padEnd(24)} ${type.sql}`;
    if (f.required) line += ' NOT NULL';
    if (f.default !== undefined) line += ` DEFAULT ${typeof f.default === 'string' ? `'${f.default}'` : f.default}`;
    return line + ',';
  });
  return `-- ${names.pascal}: generated by scripts/generate-module.mjs

CREATE TABLE IF NOT EXISTS ${names.pluralSnake} (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
${lines.join('\n')}
${hasStatusField ? '' : `  status                   VARCHAR(20) NOT NULL DEFAULT 'active',\n`}  created_by               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
}

function generateMigrationDownSql(names) {
  return `DROP TABLE IF EXISTS ${names.pluralSnake};\n`;
}

// ---------------------------------------------------------------------------
// Backend: RBAC permission module (apps/sample-server/src/modules/<pluralKebab>.ts)
// ---------------------------------------------------------------------------

function generatePermissionModule(spec, names, perms) {
  return `import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

// ${names.pluralPascal}: generated by scripts/generate-module.mjs.
export const ${names.pluralCamel}Module: ModuleDefinition = {
  key: '${names.pluralKebab}',
  name: '${names.pluralPascal}',
  routePrefix: '/api/v1/${names.pluralKebab}',
  audience: 'admin',
  permissions: [
    { code: '${perms.view}', name: 'Read ${names.pluralPascal}', description: 'View ${names.pluralLower} list and details' },
    { code: '${perms.create}', name: 'Create ${names.pluralPascal}', description: 'Create new ${names.pluralLower}' },
    { code: '${perms.update}', name: 'Update ${names.pluralPascal}', description: 'Edit existing ${names.pluralLower}' },
    { code: '${perms.delete}', name: 'Delete ${names.pluralPascal}', description: 'Remove ${names.pluralLower}' },
  ],
  featureSync: {
    code: '${names.pluralKebab}',
    name: '${names.pluralPascal}',
    groupCode: 'operations',
    routePath: '/${names.pluralKebab}',
    icon: 'list',
    sortOrder: 95,
    description: 'Manage ${names.pluralLower}',
  },
};
`;
}

// ---------------------------------------------------------------------------
// Backend: flat CRUD routes (apps/sample-server/src/<pluralKebab>-routes.ts)
// List supports search (?search=, ilike across string-ish fields), sort
// (?sort=&order=), and pagination (?page=&limit=) — matching the DataTable /
// ListPage props (`sort`, `pagination`, `onSort`, `onPageChange`) the
// generated frontend list page drives them with.
// ---------------------------------------------------------------------------

function generateRoutesFile(spec, names, perms) {
  const camelFields = spec.fields.map((f) => toCamelCase(f.name));
  const searchableTypes = new Set(['string', 'text', 'email', 'phone']);
  const searchableFields = spec.fields.filter((f) => searchableTypes.has(f.type)).map((f) => toCamelCase(f.name));
  const requiredFields = spec.fields.filter((f) => f.required).map((f) => toCamelCase(f.name));
  const hasStatusField = camelFields.includes('status');

  const dtoFields = camelFields.map((f) => `    ${f}: r.${f},`).join('\n');
  const sortWhitelist = ['createdAt', 'updatedAt', ...camelFields].filter((v, i, a) => a.indexOf(v) === i);
  const sortWhitelistEntries = sortWhitelist.map((f) => `  ${f}: schema.${names.pluralCamel}.${f},`).join('\n');

  const insertValues = camelFields.map((f) => `        ${f}: body.${f}${requiredFields.includes(f) ? '' : ' ?? null'},`).join('\n');
  const updateValues = camelFields.map((f) => `        ${f}: body.${f},`).join('\n');
  const requiredCheck = requiredFields.length
    ? `      if (${requiredFields.map((f) => `!body.${f}`).join(' || ')}) {\n        return void res.status(400).json({ error: '${requiredFields.join(', ')} ${requiredFields.length > 1 ? 'are' : 'is'} required' });\n      }\n`
    : '';

  const searchOr = searchableFields.length
    ? `or(${searchableFields.map((f) => `ilike(schema.${names.pluralCamel}.${f}, \`%\${search}%\`)`).join(', ')})`
    : 'undefined';

  return `import { Router, type RequestHandler } from 'express';
import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, ilike, or, asc, desc, sql as sqlOp } from 'drizzle-orm';

// ${names.pluralPascal}: generated by scripts/generate-module.mjs — edit
// freely, this file is not regenerated once created.

function to${names.pascal}Dto(r: typeof schema.${names.pluralCamel}.$inferSelect) {
  return {
    id: r.id,
${dtoFields}
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SORT_COLUMNS: Record<string, any> = {
${sortWhitelistEntries}
};

/**
 * ${names.pluralPascal}: generated CRUD module. Read access requires
 * \`${perms.view}\`; create/update/delete require \`${perms.create}\` /
 * \`${perms.update}\` / \`${perms.delete}\` respectively.
 */
export function create${names.pluralPascal}Router(
  db: DrizzleDb,
  deps: {
    requireAuth: RequestHandler;
    requirePermission: (perm: string) => RequestHandler;
  },
): Router {
  const router = Router();
  const requireRead = deps.requirePermission('${perms.view}');
  const requireCreate = deps.requirePermission('${perms.create}');
  const requireUpdate = deps.requirePermission('${perms.update}');
  const requireDelete = deps.requirePermission('${perms.delete}');

  // List — search + sort + pagination.
  router.get('/', deps.requireAuth, requireRead, async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const search = ((req.query.search as string) || '').trim();
      const sortKey = (req.query.sort as string) || 'createdAt';
      const orderFn = req.query.order === 'asc' ? asc : desc;
      const sortColumn = SORT_COLUMNS[sortKey] ?? schema.${names.pluralCamel}.createdAt;

      const where = search ? ${searchOr} : undefined;

      const [rows, totalRows] = await Promise.all([
        db.select().from(schema.${names.pluralCamel}).where(where).orderBy(orderFn(sortColumn)).limit(limit).offset((page - 1) * limit),
        db.select({ count: sqlOp<number>\`count(*)::int\` }).from(schema.${names.pluralCamel}).where(where),
      ]);
      const total = totalRows[0]?.count ?? 0;

      res.json({ data: { items: rows.map(to${names.pascal}Dto), total, page, limit } });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id', deps.requireAuth, requireRead, async (req, res) => {
    try {
      const rows = await db.select().from(schema.${names.pluralCamel}).where(eq(schema.${names.pluralCamel}.id, String(req.params.id)));
      if (!rows[0]) return void res.status(404).json({ error: '${names.pascal} not found' });
      res.json({ data: to${names.pascal}Dto(rows[0]) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/', deps.requireAuth, requireCreate, async (req, res) => {
    try {
      const body = req.body ?? {};
${requiredCheck}      const rows = await db
        .insert(schema.${names.pluralCamel})
        .values({
${insertValues}
        })
        .returning();
      res.status(201).json({ data: to${names.pascal}Dto(rows[0]!) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/:id', deps.requireAuth, requireUpdate, async (req, res) => {
    try {
      const body = req.body ?? {};
      const rows = await db
        .update(schema.${names.pluralCamel})
        .set({
${updateValues}
          updatedAt: new Date(),
        })
        .where(eq(schema.${names.pluralCamel}.id, String(req.params.id)))
        .returning();
      if (!rows[0]) return void res.status(404).json({ error: '${names.pascal} not found' });
      res.json({ data: to${names.pascal}Dto(rows[0]) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/:id', deps.requireAuth, requireDelete, async (req, res) => {
    try {
      await db.delete(schema.${names.pluralCamel}).where(eq(schema.${names.pluralCamel}.id, String(req.params.id)));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
`;
}

// ---------------------------------------------------------------------------
// Frontend: TypeScript types (apps/sample-web/src/features/<pluralKebab>/types.ts)
// ---------------------------------------------------------------------------

function generateTypesFile(spec, names) {
  const fieldLines = spec.fields.map((f) => {
    const type = FIELD_TYPES[f.type];
    const optional = f.required ? '' : '?';
    const tsType = f.type === 'enum' ? f.options.map((o) => JSON.stringify(o)).join(' | ') : type.ts;
    return `  ${toCamelCase(f.name)}${optional}: ${tsType};`;
  });
  const hasStatusField = spec.fields.some((f) => toCamelCase(f.name) === 'status');

  return `// ${names.pascal}: generated by scripts/generate-module.mjs.
export interface ${names.pascal} {
  id: string;
${fieldLines.join('\n')}
${hasStatusField ? '' : `  status: string;\n`}  createdAt: string;
  updatedAt: string;
}

export type Create${names.pascal}Input = Omit<${names.pascal}, 'id' | 'createdAt' | 'updatedAt'>;
export type Update${names.pascal}Input = Partial<Create${names.pascal}Input>;
`;
}

// ---------------------------------------------------------------------------
// Frontend: RTK Query API slice (apps/sample-web/src/features/<pluralKebab>/<pluralCamel>Api.ts)
// ---------------------------------------------------------------------------

function generateApiSliceFile(spec, names) {
  return `import { createApi } from '@reduxjs/toolkit/query/react';
import { apiBaseQuery } from '../../store/apiBaseQuery';
import type { ${names.pascal}, Create${names.pascal}Input, Update${names.pascal}Input } from './types';

// ${names.pluralPascal}: generated by scripts/generate-module.mjs — the
// Redux Toolkit (RTK Query) data layer for this module, following the same
// pattern as features/users/usersApi.ts.
export interface List${names.pluralPascal}Result {
  items: ${names.pascal}[];
  total: number;
  page: number;
  limit: number;
}

export interface List${names.pluralPascal}Params {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const ${names.pluralCamel}Api = createApi({
  reducerPath: '${names.pluralCamel}Api',
  baseQuery: apiBaseQuery,
  tagTypes: ['${names.pascal}'],
  endpoints: (build) => ({
    list${names.pluralPascal}: build.query<List${names.pluralPascal}Result, List${names.pluralPascal}Params>({
      query: (params) => {
        const q = new URLSearchParams();
        if (params.page) q.set('page', String(params.page));
        if (params.limit) q.set('limit', String(params.limit));
        if (params.search) q.set('search', params.search);
        if (params.sort) q.set('sort', params.sort);
        if (params.order) q.set('order', params.order);
        return { url: \`/api/v1/${names.pluralKebab}?\${q.toString()}\` };
      },
      transformResponse: (res: { data: List${names.pluralPascal}Result }) => res.data,
      providesTags: (result) =>
        result
          ? [...result.items.map((item) => ({ type: '${names.pascal}' as const, id: item.id })), { type: '${names.pascal}' as const, id: 'LIST' }]
          : [{ type: '${names.pascal}' as const, id: 'LIST' }],
    }),
    get${names.pascal}: build.query<${names.pascal}, string>({
      query: (id) => ({ url: \`/api/v1/${names.pluralKebab}/\${id}\` }),
      transformResponse: (res: { data: ${names.pascal} }) => res.data,
      providesTags: (_result, _error, id) => [{ type: '${names.pascal}', id }],
    }),
    create${names.pascal}: build.mutation<${names.pascal}, Create${names.pascal}Input>({
      query: (body) => ({ url: '/api/v1/${names.pluralKebab}', method: 'POST', body }),
      transformResponse: (res: { data: ${names.pascal} }) => res.data,
      invalidatesTags: [{ type: '${names.pascal}', id: 'LIST' }],
    }),
    update${names.pascal}: build.mutation<${names.pascal}, { id: string; data: Update${names.pascal}Input }>({
      query: ({ id, data }) => ({ url: \`/api/v1/${names.pluralKebab}/\${id}\`, method: 'PUT', body: data }),
      transformResponse: (res: { data: ${names.pascal} }) => res.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: '${names.pascal}', id }, { type: '${names.pascal}', id: 'LIST' }],
    }),
    delete${names.pascal}: build.mutation<void, string>({
      query: (id) => ({ url: \`/api/v1/${names.pluralKebab}/\${id}\`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: '${names.pascal}', id }, { type: '${names.pascal}', id: 'LIST' }],
    }),
  }),
});

export const {
  useList${names.pluralPascal}Query,
  useGet${names.pascal}Query,
  useCreate${names.pascal}Mutation,
  useUpdate${names.pascal}Mutation,
  useDelete${names.pascal}Mutation,
} = ${names.pluralCamel}Api;
`;
}

// ---------------------------------------------------------------------------
// Frontend: List + Create/Edit/Detail UI (apps/sample-web/src/features/<pluralKebab>/index.tsx)
// Follows the same modal-based CRUD convention already used in this
// codebase (menus.tsx, messaging.tsx) rather than inventing new routing —
// this app's navigation is a flat page-key switch (no nested/:id routes),
// so Add/Edit/View/Delete are modals reached from one List page.
// ---------------------------------------------------------------------------

function defaultValueLiteral(field) {
  if (field.default !== undefined) return JSON.stringify(field.default);
  switch (field.type) {
    case 'boolean': return 'false';
    case 'number': case 'decimal': return '0';
    case 'enum': return JSON.stringify(field.options[0]);
    default: return "''";
  }
}

function humanLabel(name) {
  return toPascalCase(name).replace(/([A-Z])/g, ' $1').trim();
}

function formFieldJsx(field, formVar) {
  const key = toCamelCase(field.name);
  const label = humanLabel(field.name);
  const required = field.required ? ' required' : '';
  const errorProp = field.required ? ` error={${formVar}.errors.${key}}` : '';

  if (field.type === 'text' || field.type === 'textarea') {
    return `      <TextArea label="${label}"${required} value={${formVar}.values.${key}} rows={4}\n        onChange={(e) => ${formVar}.setValue('${key}', (e.target as HTMLTextAreaElement).value)} />`;
  }
  if (field.type === 'boolean') {
    return `      <Toggle label="${label}" checked={${formVar}.values.${key}} onChange={(v) => ${formVar}.setValue('${key}', v)} />`;
  }
  if (field.type === 'enum') {
    const opts = field.options.map((o) => `{ value: ${JSON.stringify(o)}, label: ${JSON.stringify(humanLabel(o))} }`).join(', ');
    return `      <Select label="${label}"${required} value={${formVar}.values.${key}} options={[${opts}]}\n        onChange={(e) => ${formVar}.setValue('${key}', (e.target as HTMLSelectElement).value)} />`;
  }
  if (field.type === 'number' || field.type === 'decimal') {
    return `      <TextField label="${label}"${required}${errorProp} type="number" value={String(${formVar}.values.${key})}\n        onChange={(e) => ${formVar}.setValue('${key}', Number((e.target as HTMLInputElement).value))} />`;
  }
  if (field.type === 'date') {
    return `      <TextField label="${label}"${required}${errorProp} type="date" value={${formVar}.values.${key}}\n        onChange={(e) => ${formVar}.setValue('${key}', (e.target as HTMLInputElement).value)} />`;
  }
  return `      <TextField label="${label}"${required}${errorProp} value={${formVar}.values.${key}}\n        onChange={(e) => ${formVar}.setValue('${key}', (e.target as HTMLInputElement).value)} />`;
}

function generateIndexFile(spec, names) {
  const fields = spec.fields;
  const camelFields = fields.map((f) => toCamelCase(f.name));
  const hasStatusField = camelFields.includes('status');

  const usesTextArea = fields.some((f) => f.type === 'text' || f.type === 'textarea');
  const usesToggle = fields.some((f) => f.type === 'boolean');
  const usesSelect = fields.some((f) => f.type === 'enum') || !hasStatusField;

  const initialFieldValues = fields.map((f) => `${toCamelCase(f.name)}: ${defaultValueLiteral(f)}`).join(', ');
  const initialValues = hasStatusField ? initialFieldValues : `${initialFieldValues}, status: 'active'`;

  const requiredRules = fields.filter((f) => f.required).map((f) => `${toCamelCase(f.name)}: { required: true }`).join(', ');

  const formFields = fields.map((f) => formFieldJsx(f, 'form')).join('\n');
  const editFormFields = fields.map((f) => formFieldJsx(f, 'editForm')).join('\n');
  const statusFieldJsx = hasStatusField
    ? ''
    : `\n      <Select label="Status" value={form.values.status} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}\n        onChange={(e) => form.setValue('status', (e.target as HTMLSelectElement).value)} />`;
  const editStatusFieldJsx = hasStatusField
    ? ''
    : `\n      <Select label="Status" value={editForm.values.status} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}\n        onChange={(e) => editForm.setValue('status', (e.target as HTMLSelectElement).value)} />`;

  // First few non-long-text fields become default list columns.
  const listableFields = fields.filter((f) => f.type !== 'text' && f.type !== 'textarea').slice(0, 4);
  const columnLines = listableFields.map((f) => {
    const key = toCamelCase(f.name);
    const label = humanLabel(f.name);
    if (f.type === 'boolean') {
      return `  { key: '${key}', header: '${label}', render: (row) => <Badge variant={row.${key} ? 'success' : 'default'}>{row.${key} ? 'Yes' : 'No'}</Badge> },`;
    }
    return `  { key: '${key}', header: '${label}', sortable: true },`;
  });
  const statusColumnLine = `  { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'active' ? 'success' : 'danger'}>{row.status}</Badge> },`;

  const editResetFields = fields.map((f) => `${toCamelCase(f.name)}: editing.${toCamelCase(f.name)}`).join(', ');
  const editResetValues = hasStatusField ? editResetFields : `${editResetFields}, status: editing.status`;

  const detailFieldLines = fields.map((f) => {
    const key = toCamelCase(f.name);
    const label = humanLabel(f.name);
    if (f.type === 'boolean') return `        <DetailField label="${label}" value={viewing.${key} ? 'Yes' : 'No'} />`;
    return `        <DetailField label="${label}" value={viewing.${key} ?? '\\u2014'} />`;
  }).join('\n');

  const imports = [
    'ListPage', 'DataTable', 'Badge', 'Button', 'Modal', 'TextField', 'useForm', 'useToast',
    'ErrorState', 'PageLoader', 'DetailField',
    ...(usesTextArea ? ['TextArea'] : []),
    ...(usesToggle ? ['Toggle'] : []),
    ...(usesSelect ? ['Select'] : []),
  ];
  const uniqueImports = [...new Set(imports)].sort();

  return `import { useState, useEffect, type ReactNode } from 'react';
import {
  ${uniqueImports.join(', ')},
  type ColumnDef, type SortState,
} from '@mawsoftwares/ui-web';
import {
  useList${names.pluralPascal}Query,
  useCreate${names.pascal}Mutation,
  useUpdate${names.pascal}Mutation,
  useDelete${names.pascal}Mutation,
} from './${names.pluralCamel}Api';
import type { ${names.pascal} } from './types';

// ${names.pluralPascal}: generated by scripts/generate-module.mjs — edit
// freely, this file is not regenerated once created. Follows the same
// modal-based List/Create/Edit/Detail/Delete pattern already used by
// menus.tsx and messaging.tsx (this app has no nested/:id routes, so
// Add/Edit/View are modals off one List page rather than separate pages).

export function ${names.pluralPascal}View(): ReactNode {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState | undefined>(undefined);

  const { data, isLoading, isFetching, error, refetch } = useList${names.pluralPascal}Query({
    page, limit: pageSize, search: search || undefined, sort: sort?.column, order: sort?.direction,
  });
  const [createMutation] = useCreate${names.pascal}Mutation();
  const [updateMutation] = useUpdate${names.pascal}Mutation();
  const [deleteMutation] = useDelete${names.pascal}Mutation();
  const toast = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<${names.pascal} | null>(null);
  const [viewing, setViewing] = useState<${names.pascal} | null>(null);

  const form = useForm({
    initialValues: { ${initialValues} },
    fields: { ${requiredRules} },
    onSubmit: async (values) => {
      try {
        await createMutation(values as any).unwrap();
        toast.success('${names.pascal} created');
        setShowCreate(false);
        form.reset();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  const editForm = useForm({
    initialValues: { ${initialValues} },
    fields: { ${requiredRules} },
    onSubmit: async (values) => {
      if (!editing) return;
      try {
        await updateMutation({ id: editing.id, data: values as any }).unwrap();
        toast.success('${names.pascal} updated');
        setEditing(null);
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  useEffect(() => {
    if (editing) {
      editForm.reset({ ${editResetValues} });
    }
  }, [editing]);

  const remove = async (id: string) => {
    if (!window.confirm('Delete this ${names.kebab.replace(/-/g, ' ')}?')) return;
    try {
      await deleteMutation(id).unwrap();
      toast.success('${names.pascal} deleted');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (error) return <ErrorState title="Failed to load ${names.pluralLower}" message="Something went wrong" retry={refetch} />;
  if (isLoading) return <PageLoader message="Loading ${names.pluralLower}..." />;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const columns: ColumnDef<${names.pascal}>[] = [
${columnLines.join('\n')}
${statusColumnLine}
    {
      key: 'actions' as any,
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => setViewing(row)}>View</Button>
          <Button variant="ghost" onClick={() => setEditing(row)}>Edit</Button>
          <Button variant="ghost" onClick={() => remove(row.id)} style={{ color: 'var(--maw-danger)' }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <ListPage
      title="${names.pluralPascal}"
      description={total + ' ${names.pluralLower}'}
      createLabel="Create ${names.pascal}"
      onCreate={() => setShowCreate(true)}
      filter={search}
      onFilterChange={(v) => { setSearch(v); setPage(1); }}
    >
      <DataTable
        columns={columns}
        data={items}
        keyField="id"
        sort={sort}
        onSort={setSort}
        pagination={{ page, pageSize, total }}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={isFetching}
        emptyMessage="No ${names.pluralLower} found"
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create ${names.pascal}">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
${formFields}${statusFieldJsx}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => form.handleSubmit()} disabled={form.submitting}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={'Edit ${names.pascal}'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
${editFormFields}${editStatusFieldJsx}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editForm.handleSubmit()} disabled={editForm.submitting}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="${names.pascal} Details">
        {viewing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
${detailFieldLines}${hasStatusField ? '' : `
            <DetailField label="Status" value={viewing.status} />`}
          </div>
        )}
      </Modal>
    </ListPage>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Idempotent registry patches — small anchor-based insertions into existing
// files, same technique used by hand for the Messaging module this session.
// Each patch is a no-op (with a console note) if it looks already applied.
// ---------------------------------------------------------------------------

function patchFile(path, marker, transform, label) {
  const full = resolve(ROOT, path);
  let text = readFileSync(full, 'utf8');
  if (text.includes(marker)) {
    console.log(`  - already present, skipping: ${label} (${path})`);
    return;
  }
  const next = transform(text);
  if (next === text) {
    throw new Error(`Could not find anchor to patch ${path} for: ${label}`);
  }
  writeFileSync(full, next);
  console.log(`  + patched: ${label} (${path})`);
}

function patchSchemaIndex(names) {
  const marker = `from './${names.pluralKebab}'`;
  patchFile('packages/database/src/schema/index.ts', marker, (text) =>
    text + `export { ${names.pluralCamel} } from './${names.pluralKebab}';\n`,
  'schema/index.ts export');
}

function patchModulesIndex(names) {
  const importMarker = `${names.pluralCamel}Module } from './${names.pluralKebab}'`;
  patchFile('apps/sample-server/src/modules/index.ts', importMarker, (text) => {
    const importLine = `import { ${names.pluralCamel}Module } from './${names.pluralKebab}';\n`;
    const lastImport = text.lastIndexOf("import { ");
    const lineEnd = text.indexOf('\n', lastImport) + 1;
    let next = text.slice(0, lineEnd) + importLine + text.slice(lineEnd);
    next = next.replace(/registry\.register\(\s*\n/, (m) => m + `  ${names.pluralCamel}Module,\n`);
    return next;
  }, 'modules/index.ts registration');
}

function patchMainTs(names) {
  const marker = `create${names.pluralPascal}Router`;
  patchFile('apps/sample-server/src/main.ts', marker, (text) => {
    const importAnchor = "import { createMessagingRouter } from './messaging-routes';";
    if (!text.includes(importAnchor)) throw new Error('main.ts import anchor not found');
    const withImport = text.replace(
      importAnchor,
      `${importAnchor}\nimport { create${names.pluralPascal}Router } from './${names.pluralKebab}-routes';`,
    );
    const mountAnchor = /app\.use\('\/api\/v1\/messaging', createMessagingRouter\(data\.db, \{[\s\S]*?\}\)\);\n/;
    return withImport.replace(mountAnchor, (m) =>
      `${m}app.use('/api/v1/${names.pluralKebab}', create${names.pluralPascal}Router(data.db, {\n` +
      `  requireAuth: auth.requireAuth,\n` +
      `  requirePermission: (perm) => auth.requirePermission(perm),\n` +
      `}));\n`,
    );
  }, 'main.ts route mount');
}

function patchStoreIndex(names) {
  const marker = `${names.pluralCamel}Api`;
  patchFile('apps/sample-web/src/store/index.ts', marker, (text) => {
    let next = text.replace(
      "import { usersApi } from '../features/users/usersApi';",
      `import { usersApi } from '../features/users/usersApi';\nimport { ${names.pluralCamel}Api } from '../features/${names.pluralKebab}/${names.pluralCamel}Api';`,
    );
    next = next.replace(
      `[usersApi.reducerPath]: usersApi.reducer,`,
      `[usersApi.reducerPath]: usersApi.reducer,\n    [${names.pluralCamel}Api.reducerPath]: ${names.pluralCamel}Api.reducer,`,
    );
    next = next.replace(
      `getDefaultMiddleware().concat(usersApi.middleware)`,
      `getDefaultMiddleware().concat(usersApi.middleware, ${names.pluralCamel}Api.middleware)`,
    );
    return next;
  }, 'store/index.ts registration');
}

function patchAppTsx(names, perms) {
  const marker = `${names.pluralPascal}View`;
  patchFile('apps/sample-web/src/App.tsx', marker, (text) => {
    let next = text.replace(
      "import { MessagingView } from './features/messaging';",
      `import { MessagingView } from './features/messaging';\nimport { ${names.pluralPascal}View } from './features/${names.pluralKebab}';`,
    );
    next = next.replace(
      /type Page = ('[a-z-]+' \| )+'messaging';/,
      (m) => m.replace(`'messaging';`, `'messaging' | '${names.pluralKebab}';`),
    );
    next = next.replace(
      "    case 'messaging': return <MessagingView />;",
      `    case 'messaging': return <MessagingView />;\n    case '${names.pluralKebab}': return <${names.pluralPascal}View />;`,
    );
    next = next.replace(
      "  messaging: 'Read_Messaging',\n};",
      `  messaging: 'Read_Messaging',\n  ${names.pluralKebab}: '${perms.view}',\n};`,
    );
    next = next.replace(
      "  { key: 'notifications', label: 'Notifications', icon: 'bell', path: '/notifications', group: 'Dev', sortOrder: 97 },",
      `  { key: '${names.pluralKebab}', label: '${names.pluralPascal}', icon: 'list', path: '/${names.pluralKebab}', group: 'Main', sortOrder: 8, permission: '${perms.view}' },\n  { key: 'notifications', label: 'Notifications', icon: 'bell', path: '/notifications', group: 'Dev', sortOrder: 97 },`,
    );
    return next;
  }, 'App.tsx wiring (Page type, route, permission, nav item)');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function writeGenerated(path, content) {
  const full = resolve(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  if (existsSync(full)) {
    console.log(`  ! already exists, leaving untouched (edit it directly): ${path}`);
    return;
  }
  writeFileSync(full, content);
  console.log(`  + created: ${path}`);
}

function main() {
  const specPath = process.argv[2];
  if (!specPath) {
    console.error('Usage: node scripts/generate-module.mjs <path-to-spec.json>');
    process.exit(1);
  }
  const spec = loadSpec(specPath);
  const names = deriveNames(spec);
  const perms = derivePermissions(spec, names);

  console.log(`Generating module "${names.pascal}" (${names.pluralPascal})...\n`);

  console.log('Backend:');
  writeGenerated(`packages/database/src/schema/${names.pluralKebab}.ts`, generateSchemaFile(spec, names));
  const migNum = nextMigrationNumber();
  writeGenerated(`apps/sample-server/migrations/${migNum}_${names.pluralSnake}.up.sql`, generateMigrationUpSql(spec, names));
  writeGenerated(`apps/sample-server/migrations/${migNum}_${names.pluralSnake}.down.sql`, generateMigrationDownSql(names));
  writeGenerated(`apps/sample-server/src/modules/${names.pluralKebab}.ts`, generatePermissionModule(spec, names, perms));
  writeGenerated(`apps/sample-server/src/${names.pluralKebab}-routes.ts`, generateRoutesFile(spec, names, perms));

  console.log('\nFrontend:');
  writeGenerated(`apps/sample-web/src/features/${names.pluralKebab}/types.ts`, generateTypesFile(spec, names));
  writeGenerated(`apps/sample-web/src/features/${names.pluralKebab}/${names.pluralCamel}Api.ts`, generateApiSliceFile(spec, names));
  writeGenerated(`apps/sample-web/src/features/${names.pluralKebab}/index.tsx`, generateIndexFile(spec, names));

  console.log('\nWiring into registries:');
  patchSchemaIndex(names);
  patchModulesIndex(names);
  patchMainTs(names);
  patchStoreIndex(names);
  patchAppTsx(names, perms);

  console.log(`\nDone. Next steps:`);
  console.log(`  1. cd apps/sample-server && pnpm db:migrate && pnpm db:seed`);
  console.log(`  2. Restart sample-server and sample-web dev servers`);
  console.log(`  3. Open /${names.pluralKebab} in the app (permission: ${perms.view})`);
}

main();
