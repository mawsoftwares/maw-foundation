# CRUD Module Template

This is a minimal scaffold for a generic CRUD domain module.

## Instructions

1. Copy this directory to your project:
   ```bash
   cp -r templates/crud-module/server apps/my-server/src/modules/orders
   cp -r templates/crud-module/web    apps/my-web/src/modules/orders
   ```

2. Do a global find-replace in the copied directory:
   - `Entity`   → `Order`  (PascalCase entity name)
   - `entity`   → `order`  (camelCase)
   - `entities` → `orders` (plural)
   - `ENTITY`   → `ORDER`  (UPPER_CASE)
   - `crud-module` → `orders` (the module key)

3. Update the database migration in `server/infrastructure/database/migrations/001_create_table.ts`
   to define your actual table columns.

4. Add/remove fields on `Entity` in `server/domain/entities/Entity.ts`.

5. Adjust DTOs, validators, and use-cases as needed.

6. Wire up in your server and web app (see `templates/README.md`).

## What this template provides

- Domain entity interface
- Domain events
- Application DTOs (Create, Update, Response, ListQuery)
- Use cases: Create, Get, List, Update, Delete
- Repository interface (`IEntityRepository`) + Postgres implementation
- Database migration
- Express router factory with RBAC permission guards
- Controller (framework-agnostic `HttpRequest`/`HttpResponse`)
- Frontend list view with `useDynamicAccess` RBAC guards
- Frontend form component using `@mawsoftwares/ui-web`
- Module definition (permissions + featureSync)
