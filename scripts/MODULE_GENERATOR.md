# Module Generator

Scaffolds a full CRUD module (backend + frontend) from a JSON spec, following
the same conventions used by the hand-written modules in this repo (Users,
Messaging, etc.).

## Usage

```
node scripts/generate-module.mjs module-specs/<name>.json
```

Run from the repo root. Requires plain `node` — no build step, no tsx/vite,
so it works even where the dev toolchain doesn't.

## Spec format

```json
{
  "name": "Customer",
  "fields": [
    { "name": "name", "type": "string", "required": true },
    { "name": "email", "type": "email", "required": true },
    { "name": "mobile", "type": "string", "required": true },
    { "name": "companyName", "type": "string", "required": false },
    { "name": "status", "type": "enum", "options": ["active", "inactive"], "default": "active" }
  ]
}
```

- `name`: singular PascalCase-able entity name (e.g. `Customer`, `Employee`, `Vendor`).
- `fields[]`: `name`, `type` (`string` | `email` | `number` | `decimal` | `boolean` | `enum` | `text` | `textarea`),
  `required` (default false), `options` (enum only), `default`.
- A `status` enum field is optional — if present, it's treated as the module's
  active/inactive flag and gets its own list-column Badge; if you omit it,
  the generator still adds one automatically so every module has a
  consistent activate/deactivate story.
- `permissions` (optional): override the auto-derived `Read_<Plural>`,
  `Create_<Plural>`, `Update_<Plural>`, `Delete_<Plural>` codes.

## What it generates

Backend:
- `packages/database/src/schema/<name>.ts` — Drizzle table
- `apps/sample-server/migrations/0NN_<name>.{up,down}.sql`
- `apps/sample-server/src/modules/<name>.ts` — RBAC `ModuleDefinition`
- `apps/sample-server/src/<name>-routes.ts` — list/get/create/update/delete + validation

Frontend:
- `apps/sample-web/src/features/<name>/types.ts`
- `apps/sample-web/src/features/<name>/<name>Api.ts` — RTK Query slice
- `apps/sample-web/src/features/<name>/index.tsx` — List page with search/sort/pagination,
  Create/Edit modals, Detail modal, Delete action, loading/empty/error states, toasts

Wiring (idempotent patches, safe to re-run):
- `packages/database/src/schema/index.ts` — schema export
- `apps/sample-server/src/modules/index.ts` — module registration
- `apps/sample-server/src/main.ts` — route mount
- `apps/sample-web/src/store/index.ts` — RTK store registration
- `apps/sample-web/src/App.tsx` — Page type, nav item, permission map, route case

## After generating

```
cd apps/sample-server && pnpm db:migrate && pnpm db:seed
```

Then restart both dev servers (no file-watching picks up new routes/registries
automatically) and open the new page from the nav.

## Removing a generated module

There's no "ungenerate" command. Delete the created files and manually
remove the 5 patched lines/blocks listed above (each is a single clearly
marked insertion — search each of those 5 files for the module's name).
