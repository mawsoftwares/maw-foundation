# MAW Foundation — API Contracts

This directory contains the **backend-agnostic API contract** for the MAW Foundation platform.
Both the Node.js and PHP backends implement these contracts identically.

## Structure

```
contracts/
├── openapi/
│   ├── openapi.yaml       ← Root spec (references all domain specs)
│   ├── auth.yaml           ← Authentication, MFA, sessions, social
│   ├── users.yaml          ← User management (admin)
│   ├── rbac.yaml           ← Roles, permissions, modules
│   ├── tenants.yaml        ← Multi-tenant management
│   ├── orders.yaml         ← Order management
│   ├── menus.yaml          ← Menu/navigation
│   ├── messaging.yaml      ← Email templates, send operations
│   ├── reporting.yaml      ← Report definitions, execution
│   ├── files.yaml          ← File upload/management (legacy multipart API)
│   ├── storage.yaml        ← MAW Storage: folders, signed direct upload/download, providers (local/S3/R2/Azure)
│   ├── jobs.yaml           ← Background jobs
│   └── system.yaml         ← Health, config, notifications
├── schemas/
│   └── common.yaml         ← Shared schemas (envelopes, pagination, errors, tokens)
└── errors/
    └── error-codes.json    ← Standard error code registry
```

## Backend coverage

| Spec | Node.js | PHP / Laravel |
|---|---|---|
| auth, users, rbac, tenants, orders, menus, messaging, reporting, files, jobs, system | implemented | implemented |
| **storage** | implemented (`apps/sample-server/src/modules/storage`) | implemented (`backend-php/app/Storage`) |

Both backends share the same Postgres database (Node's migrations create the `maw_storage_*` tables) and must
follow `storage.yaml`: tenant-scoped 404s, server-generated object keys, signed direct upload, and the credential
cipher format (AES-256-GCM `v1:<iv>:<data>:<tag>`, key `STORAGE_ENCRYPTION_KEY`) so each can read the other's rows.
To interoperate when both serve one deployment, give them the SAME `STORAGE_ENCRYPTION_KEY`,
`STORAGE_LOCAL_SIGNING_SECRET`, `JWT_SECRET` and (for local storage) `STORAGE_LOCAL_ROOT`.

Drift checks for storage:
- Node: `apps/sample-server/src/modules/storage/__tests__/storage.contract.test.ts` (routes, permissions, error
  reasons, file statuses, providers) and the schema assertions in `storage.api.integration.test.ts`.
- PHP: `backend-php/tests/Contract/StorageContractTest.php` (same checks against the Laravel routes).
- Byte-level interoperability: `backend-php/tests/Unit/Storage/NodeInteropTest.php` reproduces values produced by
  the real Node code/SDKs (`node --import=tsx apps/sample-server/scripts/php-interop-fixtures.ts` regenerates them).

## Rules

1. **This is the source of truth** — both Node.js and PHP must conform to these specs.
2. **Changes here first** — modify the contract, then update both backends.
3. **Contract tests** verify conformance — same request → both backends → validate against spec.
4. **Don't duplicate** — if a type is defined here, don't redefine it in backend code.

## Usage

### View the API docs

```bash
npx @redocly/cli preview-docs contracts/openapi/openapi.yaml
```

### Validate the spec

```bash
npx @redocly/cli lint contracts/openapi/openapi.yaml
```

### Generate TypeScript types (Node.js)

```bash
npx openapi-typescript contracts/openapi/openapi.yaml -o contracts/generated/types.ts
```

### Generate PHP DTOs (Laravel)

```bash
# From backend-php/
php artisan openapi:generate ../contracts/openapi/openapi.yaml
```

## Conformance Verification

### Validator unit tests (no backend needed)

```bash
npx vitest run contracts/verification/validate.test.ts
```

### PHP contract tests (no backend needed)

```bash
cd backend-php && composer test:contract
```

### Cross-backend conformance (both backends running)

```bash
NODE_URL=http://localhost:3001 PHP_URL=http://localhost:8080 \
  npx tsx contracts/verification/conformance-runner.ts
```

See [verification/README.md](verification/README.md) for details.
