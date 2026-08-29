# Creating a New Product on MAW Foundation

This guide walks through starting a new product that reuses the foundation packages.

**Product apps live in their own repos.** They install `@mawsoftwares/*` from GitHub Packages. They do not copy-paste foundation source, and they do not add product apps into this monorepo.

How to authenticate and install: [`docs/publishing.md`](../docs/publishing.md).

## Prerequisites

- Node.js 22+
- PostgreSQL 15+
- pnpm 9+
- A GitHub PAT with `read:packages` (org members of `mawsoftwares`)

## Step 1: Product repo `.npmrc`

```
@mawsoftwares:registry=https://npm.pkg.github.com
```

Put the token in **your** `~/.npmrc` (not the repo):

```
//npm.pkg.github.com/:_authToken=ghp_xxxxxxxxxxxx
```

```bash
pnpm config set //npm.pkg.github.com/:_authToken ghp_xxxxxxxxxxxx
```

## Step 2: Add Your App

In the **product** repository, create:

```
apps/your-server/     # Express or Hono backend
apps/your-web/        # React frontend
```

Pin Foundation versions (example `0.1.0`). Never use `workspace:*` outside `maw-foundation`.

### Server `package.json`

```json
{
  "name": "@your-product/server",
  "private": true,
  "type": "module",
  "dependencies": {
    "@mawsoftwares/sdk": "0.1.0",
    "@mawsoftwares/database": "0.1.0",
    "@mawsoftwares/auth-core": "0.1.0",
    "@mawsoftwares/rbac-core": "0.1.0",
    "@mawsoftwares/tenancy": "0.1.0",
    "@mawsoftwares/observability": "0.1.0",
    "@mawsoftwares/server-express": "0.1.0",
    "@mawsoftwares/communication": "0.1.0",
    "@mawsoftwares/queue": "0.1.0",
    "express": "^5.0.0",
    "pg": "^8.16.0",
    "tsx": "^4.19.0"
  }
}
```

Users (and other domain entities) are **not** an installable package. Copy [`templates/users-module`](../templates/users-module) into the product and own the code. See [`docs/module-architecture.md`](../docs/module-architecture.md).

### Web `package.json`

```json
{
  "name": "@your-product/web",
  "private": true,
  "type": "module",
  "dependencies": {
    "@mawsoftwares/sdk": "0.1.0",
    "@mawsoftwares/theme": "0.1.0",
    "@mawsoftwares/ui-web": "0.1.0",
    "@mawsoftwares/ui-auth": "0.1.0",
    "@mawsoftwares/api-client": "0.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

## Step 3: Wire the Server

Minimal `main.ts`:

```typescript
import express from 'express';
import pg from 'pg';
import { createDynamicExpressAuth } from '@mawsoftwares/server-express';
import { createTenantMiddleware, createAuthRoutes } from '@mawsoftwares/server-express';
import { populateRequestContext } from '@mawsoftwares/server-express';
import { PgTenantRepository, AlsTenantContextHolder, HeaderTenantResolver } from '@mawsoftwares/tenancy';
import { ScryptHasher, RegistrationService, PasswordResetService } from '@mawsoftwares/auth-core';

// 1. Database
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// 2. Auth + RBAC
const auth = createDynamicExpressAuth({
  jwtSecret: process.env.JWT_SECRET!,
  cache: masterCache,          // load from your masters table
  superuserRoles: ['superadmin'],
});

// 3. Tenancy
const tenantRepo = new PgTenantRepository(pool);
const tenantCtx = new AlsTenantContextHolder();
const tenantResolver = new HeaderTenantResolver(tenantRepo);

// 4. Express app
const app = express();
app.use(express.json());
app.use(populateRequestContext());
app.use(createTenantMiddleware({
  resolver: tenantResolver,
  contextHolder: tenantCtx,
  rejectOnMissing: false,
}));

// 5. Auth routes
const hasher = new ScryptHasher();
app.use('/api/v1/auth', createAuthRoutes({
  requireAuth: auth.requireAuth,
  registrationService: new RegistrationService({ /* ... */ }),
  passwordResetService: new PasswordResetService({ /* ... */ }),
}));

// 6. Your domain routes
app.use('/api/v1/your-domain', auth.requireAuth, yourRouter);

app.listen(Number(process.env.PORT ?? 4000));
```

## Step 4: Database Setup

Create a `migrations/` directory in your server app. The foundation provides
migration patterns in `apps/sample-server/migrations/` — copy the auth, RBAC,
and tenancy migrations (001-008) as your baseline.

Run migrations:
```bash
node --env-file=.env --import=tsx src/db/migrate.ts
```

## Step 5: Wire the Frontend

```typescript
import { ThemeProvider, createTheme } from '@mawsoftwares/theme';
import { createApiClient } from '@mawsoftwares/api-client';

const theme = createTheme(); // or with brand overrides
const api = createApiClient({
  baseUrl: '/api/v1',
  getToken: () => localStorage.getItem('token'),
});
```

## Key Decisions

| Concern | Package | Pattern |
|---------|---------|---------|
| Authentication | `auth-core` + `server-express` | JWT bearer tokens, refresh rotation |
| Authorization | `rbac-core` | Dynamic permission check via MasterCache |
| Multi-tenancy | `tenancy` | Header-based resolution → ALS context |
| File storage | `platform` | `LocalFileStorage` (dev) / `S3FileStorage` (prod) |
| Background jobs | `queue` | `PgQueueProvider` with retry policies |
| Notifications | `communication` | `SmtpNotificationProvider` + `PgInAppNotificationStore` |
| Observability | `observability` | Structured logging, metrics, tracing via ALS |
| Money | `sdk/kernel/money` | Integer minor units, never floats |

## What NOT to Do

- Don't import domains from other domains (dependency law)
- Don't use `any` types
- Don't hardcode strings — use i18n
- Don't hardcode colors/spacing — use theme tokens
- Don't store money as floats/decimals
- Don't edit bills — create BillAdjustment records
- Don't skip `npm run verify` before committing
