# MAW Storage

Provider-agnostic file storage for MAW products. Applications upload, download, organise and
attach files through one API and never learn whether the bytes live on local disk, AWS S3, or
(later) R2 / GCS / Azure / MinIO.

- Code: [`apps/sample-server/src/modules/storage/`](../apps/sample-server/src/modules/storage)
- Migration: [`029_storage.up.sql`](../apps/sample-server/migrations/029_storage.up.sql)
- It is **one internal module, not a package**. Its only outside dependencies are the SDK
  (errors, logger), the `Controller` type, an injected `PgPool` and an injected
  `IEncryptionService`, so `src/modules/storage/` can be lifted into `@maw/storage` unchanged.
- The legacy `/files/*` routes (multer + `file_metadata`) are untouched and keep working. New
  code should use `/api/v1/storage/*`.

> **Migration numbering:** a shared dev database may also be used by another project (e.g. `maw-admin-server` owns
> versions 024–028 in `schema_migrations`). The runner tracks applied migrations by version number only, so a
> colliding number is silently skipped. Storage uses `029`; pick the next free number if you adopt it elsewhere.

## 1. Architecture

```
React / Next / React Native / Expo
            │  JSON (metadata only)              ┌──────────────── bytes ────────────────┐
            ▼                                    │                                        ▼
   /api/v1/storage  ──►  Controller ──► Service ──► StorageProvider ──► Local disk | S3 | (R2 …)
   (auth + RBAC + tenant)                  │
                                           └──► Repositories ──► Postgres (maw_storage_*)
```

| Layer | Folder | Rule |
|---|---|---|
| Controllers | `controllers/` | Parse + validate input, take tenant/user **only** from the authenticated context, call one service. No SQL, no SDKs. |
| Services | `services/` | All business rules. Talk to repositories and to `StorageProvider` — never to an SDK or a provider name. |
| Repositories | `repositories/` | All SQL. Every method takes `tenantId` and filters on it. |
| Providers | `providers/*` | The only code that knows about disks, buckets, SDKs and URL signing. |
| Core | `core/` | `StorageProvider` interface, `StorageProviderFactory`, constants, errors, config loader. |

Services never contain `if (provider === 's3')`. The provider is chosen from the tenant's
configuration row by `StorageProviderFactory.get(runtimeConfig)`.

Files are **never proxied** through MAW for S3: the server only authenticates, validates,
records metadata and signs URLs; the client sends the bytes straight to the provider.

## 2. Provider abstraction

```ts
interface StorageProvider {
  createUploadUrl(i: { key; contentType; contentLength; expiresInSeconds }): Promise<{ url; method: 'PUT'; headers; expiresAt }>;
  createDownloadUrl(i: { key; fileName; contentType; disposition; expiresInSeconds }): Promise<{ url; expiresAt }>;
  deleteObject({ key }): Promise<void>;                 // idempotent
  objectExists({ key }): Promise<boolean>;
  getObjectMetadata({ key }): Promise<{ size; contentType | null; etag | null }>; // throws STORAGE_OBJECT_NOT_FOUND
  verifyAccess(): Promise<void>;                        // used by "test configuration"
}
```

Keys are provider-relative; each provider applies its own `basePath`. Implementations:
`providers/local/LocalStorageProvider.ts`, `providers/s3/S3StorageProvider.ts`.
`providers/index.ts → createDefaultProviderFactory()` is the single place that lists providers.

## 3. Database tables

All `tenant_id` columns are `VARCHAR(64)` (matches the rest of the foundation, e.g. `demo-tenant`).

| Table | Purpose |
|---|---|
| `maw_storage_providers` | Master list (`local`, `s3` seeded). |
| `maw_storage_provider_configs` | Per-tenant provider settings: bucket, region, endpoint, `base_path`, `encrypted_credentials`, `is_default`, `is_active`. |
| `maw_storage_folders` | Logical folders: `parent_id`, `name`, materialised `path`, soft delete. Sibling names unique (case-insensitive) among active folders. |
| `maw_storage_files` | File metadata + `object_key` + `status` (`pending → uploaded` / `failed` / `deleted`), `visibility` (`private` only), `file_size`, `checksum`. |
| `maw_storage_file_versions` | One row per version (V1 writes version 1 on completion) — versioning is not blocked. |
| `maw_storage_attachments` | Generic `file ↔ (entity_type, entity_id, category)` link. No product-specific columns. |

Indexes cover `(tenant_id, parent_id)`, `(tenant_id, folder_id)`, `(tenant_id, storage_config_id)`,
`(tenant_id, status)` and a partial index on pending uploads for the cleanup job. Storage usage is
`SUM(file_size)` grouped by tenant / config / folder.

## 4. Upload flow

```
POST /storage/uploads {folderId?, fileName, contentType, fileSize}
  auth → permission → tenant from JWT → validate (name, MIME, size ≤ limit) → folder (tenant-scoped)
  → config/provider → fileId + object key → INSERT status=pending → signed URL
  ← 201 { fileId, uploadUrl, method: "PUT", headers, expiresIn }

client:  PUT uploadUrl   (send the returned headers; body = file bytes)   ──► provider directly

POST /storage/uploads/:fileId/complete
  tenant-scoped lookup → provider.getObjectMetadata → compare size (+ content type when known)
  match      → status=uploaded, version 1 created
  mismatch   → status=failed, stray object deleted, STORAGE_UPLOAD_FAILED
  not there  → stays pending, STORAGE_UPLOAD_NOT_COMPLETED (client may retry)
```

Object key: `tenant/{tenantId}/folder/{folderId|root}/file/{fileId}/original`. Built only from
validated identifiers; the original filename is metadata, never part of the key.

React Native / Expo: the response is plain JSON — do `fetch(uploadUrl, { method, headers, body: blob })`.

**Orphans:** abandoned `pending` rows are expected. The `storage.cleanup` queue job
(`StorageCleanupService`) removes any partial object and marks uploads older than
`STORAGE_PENDING_UPLOAD_MAX_AGE_HOURS` (24) as `failed`. It also retries provider deletes for files
whose object delete failed (they keep `deleted_at` set with a non-`deleted` status). It is enqueued
every `STORAGE_CLEANUP_INTERVAL_MINUTES` (60; `0` disables) and can be run by hand with
`POST /api/v1/jobs {"type":"storage.cleanup"}`.

## 5. Download flow

`GET /storage/files/:fileId/download-url[?disposition=inline|attachment]` →
`{ url, expiresIn }` (default 300 s). Only `uploaded` files. The client decides how to preview
(image / PDF / video viewer, or open externally); the module only provides secure access.

## 6. Configuration

`STORAGE_*` environment variables (all optional):

| Variable | Default | Meaning |
|---|---|---|
| `STORAGE_LOCAL_ROOT` | `./storage` | Local provider root directory. |
| `STORAGE_LOCAL_SIGNING_SECRET` | `JWT_SECRET` | HMAC secret (≥16 chars) for local signed URLs. |
| `STORAGE_ENCRYPTION_KEY` | `MFA_ENCRYPTION_KEY` | 64-hex AES-256-GCM key for credentials at rest. Production refuses the all-zero key. |
| `STORAGE_UPLOAD_URL_TTL_SECONDS` | `900` | |
| `STORAGE_DOWNLOAD_URL_TTL_SECONDS` | `300` | |
| `STORAGE_MAX_FILE_SIZE_BYTES` | `104857600` | Checked at request time and again at completion. |
| `STORAGE_ALLOWED_MIME_TYPES` | _(any well-formed)_ | Comma list; exact types or `image/*`. |
| `PUBLIC_URL` | `http://localhost:$PORT` | Origin used in local signed URLs. |

Per-tenant provider choice is data, not code (admin API, permission `Manage_StorageConfiguration`):

```
GET    /storage/configurations
POST   /storage/configurations        { provider: "local"|"s3", name, bucket?, region?, endpoint?, basePath?, credentials?, isDefault? }
PATCH  /storage/configurations/:id
DELETE /storage/configurations/:id    (refused for the default or when folders/files reference it)
POST   /storage/configurations/:id/test
```

The first configuration of a tenant becomes its default. Responses contain safe metadata only
(`id, provider, name, bucket, region, endpoint, basePath, hasCredentials, isDefault, isActive`).
Folders pin a configuration (children inherit it); root-level files use the tenant default.

## 7. Local storage setup

1. `STORAGE_LOCAL_ROOT=./storage` (created on demand).
2. Run migrations (`pnpm --filter @mawsoftwares/sample-server db:migrate`) and seed (registers the permissions).
3. `db:seed` creates a default local configuration for `demo-tenant`. Other tenants: as an admin, `POST /api/v1/storage/configurations {"provider":"local","name":"Local"}`.

Local disk has no pre-signed URLs, so the provider issues HMAC-signed `PUT`/`GET` URLs served by a
small gateway in this server (`/api/v1/storage/local/:token`, no bearer auth — the token *is* the
authorisation, scoped to one tenant/config/key/operation/size/content-type and short-lived). It
streams to a temp file and renames; it enforces declared size and `Content-Type`; paths are
resolved under the root and traversal is rejected. The filesystem path is never returned.
`main.ts` mounts it after the security middleware but makes the JSON body parser skip it.

## 8. S3 setup

Bucket stays **private**; no public ACLs are needed. The IAM identity needs
`s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket` (for HEAD + test) on the
bucket/prefix. Configure CORS on the bucket so browsers can `PUT` (allow `PUT`, expose `ETag`,
allow the `Content-Type` header, your web origins). Then:

```json
POST /api/v1/storage/configurations
{ "provider": "s3", "name": "Prod files", "bucket": "client-files", "region": "ap-south-1",
  "basePath": "maw/prod", "isDefault": true,
  "credentials": { "accessKeyId": "…", "secretAccessKey": "…" } }
```

Omit `credentials` to use the server's default AWS credential chain (instance role etc.). Setting
`endpoint` switches to path-style addressing for MinIO / R2 / other S3-compatible stores. Upload
URLs sign `Content-Type` and `Content-Length`, so the client must send exactly what it declared.

### Verifying S3 for real

Minimal IAM policy (replace bucket/prefix):

```json
{ "Version": "2012-10-17", "Statement": [
  { "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"], "Resource": "arn:aws:s3:::client-files/maw/prod/*" },
  { "Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": "arn:aws:s3:::client-files" } ] }
```

Bucket CORS (browser uploads/downloads):

```json
[{ "AllowedOrigins": ["https://app.example.com"], "AllowedMethods": ["PUT", "GET"],
   "AllowedHeaders": ["Content-Type", "Content-Length"], "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3000 }]
```

Run the live contract test (writes and deletes one object under `maw-storage-live-test/`; works with
MinIO via `STORAGE_TEST_S3_ENDPOINT`):

```bash
STORAGE_TEST_S3_BUCKET=client-files STORAGE_TEST_S3_REGION=ap-south-1 \
  pnpm vitest run apps/sample-server/src/modules/storage/__tests__/s3.live.integration.test.ts
```

## 9. Security model

- **Tenant isolation:** tenant and user come from the authenticated context, never from the
  client. Every repository method filters by `tenant_id`; another tenant's id behaves exactly like
  "not found" (404 with `STORAGE_*_NOT_FOUND`), for files, folders, configurations and attachments.
- **RBAC:** `Read_Storage`, `Upload_Storage`, `Download_Storage`, `Create_StorageFolders`,
  `Update_StorageFolders`, `Delete_StorageFolders`, `Delete_StorageFiles`,
  `Manage_StorageConfiguration` — registered in the module registry (`modules/storage/permissions.ts`)
  and enforced per route with `auth.requirePermission`. Admin roles get them from the seed loop.
- **Secrets:** credentials are AES-256-GCM encrypted (`AesEncryptionService`), decrypted only to
  build a provider in memory, never returned (`hasCredentials` only), never logged.
- **Private by default:** `visibility` is constrained to `private`; access is via short-lived signed URLs.
- **No trust in client metadata:** MIME shape/allow-list, size limit and filename sanitising at
  request time; size (and content type where the provider reports it) re-verified at completion.
- **Path traversal:** keys are generated from validated ids, re-validated by every provider, and the
  local provider additionally checks the resolved path stays under its root. Base paths are validated.
- **Logging:** operational events (upload requested/completed/failed, download URL generated, file
  deleted, provider error) are logged with ids only — never signed URLs, tokens, keys or credentials.
  Provider errors are reduced to a generic `STORAGE_PROVIDER_ERROR`. The local gateway is mounted
  before the request logger so signed tokens in its path are not logged.
- **Errors:** responses carry a standard SDK `code` plus `details.reason` =
  `STORAGE_PROVIDER_NOT_FOUND | CONFIGURATION_NOT_FOUND | FOLDER_NOT_FOUND | FILE_NOT_FOUND |
  ACCESS_DENIED | UPLOAD_FAILED | UPLOAD_NOT_COMPLETED | OBJECT_NOT_FOUND | PROVIDER_ERROR |
  INVALID_FILE | INVALID_INPUT | CONFLICT` (prefixed `STORAGE_`). The shared SDK `ErrorCode` union
  was deliberately not extended.

## API summary

| Method & path | Permission |
|---|---|
| `POST /storage/uploads`, `POST /storage/uploads/:fileId/complete` | `Upload_Storage` |
| `GET /storage/files/:fileId` | `Read_Storage` |
| `GET /storage/files/:fileId/download-url` | `Download_Storage` |
| `DELETE /storage/files/:fileId` | `Delete_StorageFiles` |
| `GET /storage/folders` (`parentId`, `search`, `page`, `pageSize`, `sortBy=name|createdAt|updatedAt`, `sortDir`) | `Read_Storage` |
| `POST /storage/folders` · `PATCH /storage/folders/:id` (rename and/or move) · `DELETE /storage/folders/:id` (empty only) | `Create_` / `Update_` / `Delete_StorageFolders` |
| `GET /storage/folders/:id/files` (`:id` may be `root`; `search`, paging, `sortBy=name|size|createdAt`) | `Read_Storage` |
| `POST /storage/attachments` · `GET /storage/attachments?entityType&entityId[&category]` · `DELETE /storage/attachments/:id` | `Upload_` / `Read_` / `Delete_StorageFiles` |
| `/storage/configurations` (+ `/:id`, `/:id/test`) | `Manage_StorageConfiguration` |

## 10. Adding another provider (example: Cloudflare R2)

R2 is S3-compatible, so the quickest route is configuration only:
`provider: "s3"` with `endpoint: "https://<account>.r2.cloudflarestorage.com"`, `region: "auto"`.

For a provider with its own SDK (e.g. native R2, GCS, Azure):

1. Create `providers/r2/R2StorageProvider.ts` implementing `StorageProvider`
   (constructor takes `StorageProviderRuntimeConfig`; keep SDK calls and error mapping inside it;
   prefix keys with `config.basePath`; reuse `assertSafeObjectKey`).
2. Register it in `providers/index.ts`:
   `.register('r2', (config) => new R2StorageProvider(config))`.
3. Add `'r2'` to `STORAGE_PROVIDER_TYPES` in `types/storage.types.ts`, and insert a row in
   `maw_storage_providers` (new migration: `INSERT … ('r2','Cloudflare R2','r2')`).
4. Add its validation rules to `validateCreateConfiguration` if it needs different fields.
5. Add a signing/contract test next to `providers.test.ts`.

No service, controller or repository changes are required.

## Tests

```
pnpm vitest run apps/sample-server/src/modules/storage      # unit: providers, services, security
STORAGE_TEST_DATABASE_URL=postgres://…/scratch \
  pnpm vitest run apps/sample-server/src/modules/storage    # + HTTP/Postgres end-to-end
```

The end-to-end suite creates and drops its own schema; point it at any scratch database.

## Out of scope for V1 (architecture allows them)

OCR, virus scanning, image/video processing, public/expiring share links, multipart upload,
quota/billing, CDN and duplicate detection.
