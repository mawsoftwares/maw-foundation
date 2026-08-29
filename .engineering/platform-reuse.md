# Creating a New Product on MAW Foundation

This guide walks through starting a new product that reuses the foundation packages.

## Prerequisites

- Node.js 22+
- PostgreSQL 15+
- pnpm 9+ (workspace-aware)

## Step 1: Add Your App

Create two directories in the monorepo:

```
apps/your-server/     # Express or Hono backend
apps/your-web/        # React frontend
```

### Server `package.json`

```json
{
  "name": "@mawsoftwares/your-server",
  "private": true,
  "type": "module",
  "dependencies": {
    "@mawsoftwares/sdk": "*",
    "@mawsoftwares/database": "*",
    "@mawsoftwares/auth-core": "*",
    "@mawsoftwares/rbac-core": "*",
    "@mawsoftwares/tenancy": "*",
    "@mawsoftwares/users": "*",
    "@mawsoftwares/observability": "*",
    "@mawsoftwares/server-express": "*",
    "@mawsoftwares/communication": "*",
    "@mawsoftwares/queue": "*",
    "express": "^5.0.0",
    "pg": "^8.16.0"
  }
}
```

### Web `package.json`

```json
{
  "name": "@mawsoftwares/your-web",
  "private": true,
  "type": "module",
  "dependencies": {
    "@mawsoftwares/sdk": "*",
    "@mawsoftwares/theme": "*",
    "@mawsoftwares/ui-web": "*",
    "@mawsoftwares/ui-auth": "*",
    "@mawsoftwares/api-client": "*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

## Step 2: Wire the Server

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

## Step 3: Database Setup

Create a `migrations/` directory in your server app. The foundation provides
migration patterns in `apps/sample-server/migrations/` — copy the auth, RBAC,
and tenancy migrations (001-008) as your baseline.

Run migrations:
```bash
node --env-file=.env --import=tsx src/db/migrate.ts
```

## Step 4: Wire the Frontend

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
