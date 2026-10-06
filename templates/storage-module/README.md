# Storage Source Module Template

Provider-agnostic file storage: local disk, AWS S3 (S3-compatible via `endpoint`), Cloudflare R2 and Azure Blob, logical folders,
signed **direct** uploads/downloads, per-tenant provider configuration with encrypted credentials,
generic attachments, RBAC, tenant isolation, and an orphan-cleanup job. Full design and API:
[`docs/storage.md`](../../docs/storage.md).

The canonical, tested copy lives in `apps/sample-server/src/modules/storage` (+ `apps/sample-web/src/features/storage*`).
This template is a snapshot of it — re-copy when the sample changes.

API contract: [`contracts/openapi/storage.yaml`](../../contracts/openapi/storage.yaml) — any backend serving this module must follow it
(the bundled `storage.contract.test.ts` expects the repo's `contracts/` folder; adjust or drop it when copying into a product repo).

## Copy

```bash
cp -r templates/storage-module/server apps/my-server/src/modules/storage
cp -r templates/storage-module/web/*  apps/my-web/src/features/      # storage/ (reusable components) + page + settings
cp    templates/storage-module/server/migrations/storage.up.sql   apps/my-server/migrations/<NEXT>_storage.up.sql
cp    templates/storage-module/server/migrations/storage.down.sql apps/my-server/migrations/<NEXT>_storage.down.sql
cp    templates/storage-module/server/migrations/storage_providers_r2_azure.up.sql   apps/my-server/migrations/<NEXT+1>_storage_providers_r2_azure.up.sql
cp    templates/storage-module/server/migrations/storage_providers_r2_azure.down.sql apps/my-server/migrations/<NEXT+1>_storage_providers_r2_azure.down.sql
```

Use the **next free migration number** for your database (the runner skips a version that is already recorded).
Add to the server `package.json`: `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (`^3`) for S3/R2, and `@azure/storage-blob` (`^12`) for Azure.

## Wire (server `main.ts`)

```ts
import { createStorageModule, loadStorageConfig, storageModule, STORAGE_LOCAL_GATEWAY_PATH, STORAGE_ROUTE_PREFIX } from './modules/storage';

registry.register(/* ... */, storageModule);                 // RBAC permissions

const storage = createStorageModule({
  pool,                                                     // PgPool
  encryption: new AesEncryptionService(STORAGE_ENCRYPTION_KEY),
  config: loadStorageConfig((n) => process.env[n], { signingSecretFallback: JWT_SECRET, publicBaseUrl: PUBLIC_URL }),
  requireAuth: auth.requireAuth,
  requirePermission: (p) => auth.requirePermission(p),
});

// JSON body parser must skip the local gateway; mount it after security middleware, before request logging.
app.use(STORAGE_LOCAL_GATEWAY_PATH, storage.localGatewayRouter);
app.use(STORAGE_ROUTE_PREFIX, storage.router);

// Optional cleanup job (abandoned uploads, interrupted deletions):
workerRegistry.register('storage.cleanup', async () => ({ success: true, result: { ...(await storage.services.cleanup.run()) } }));
```

Web: add a `Files` nav item (`Read_Storage`), a `Storage Settings` admin page (`Manage_StorageConfiguration`),
and enable the `module.storage` feature flag if your app gates modules by flag.
Seed: re-run so admin roles receive the `*_Storage*` permissions, and optionally create a default `local`
configuration per tenant.
