# @mawsoftwares/api-client

## Unreleased

### Minor Changes

- Migrated the internal HTTP transport from `fetch`/XHR to `axios`. This is purely
  an implementation detail — every public method (`request`, `upload`,
  `onRequest`/`onResponse`/`onError`, `signIn`/`refresh`/etc.), the
  `ApiClientOptions` constructor shape, and the `ApiError`/`CancelledError`/
  `CancellablePromise` contracts are unchanged and remain drop-in compatible.
  Cancellation is now wired through axios's native `AbortController` support,
  and upload progress uses axios's `onUploadProgress` instead of a hand-rolled
  XHR implementation.
- Added opt-in retry with exponential backoff + jitter, configurable globally via
  `ApiClientOptions.retry` and per-call via `request(path, { retry })`. Defaults
  to `attempts: 0` (off) so existing behavior is unchanged unless a consumer
  opts in. Only retries network errors, timeouts, and 5xx responses — never
  4xx. GET/HEAD/OPTIONS retry by default once `attempts > 0`; mutating methods
  (POST/PUT/PATCH/DELETE) only retry when `retryMutations: true` is also set.
  The backoff calculation is exported as the pure function `computeBackoffMs`.
- Added a proactive JWT-expiry check: `applyAuth()` now decodes the stored
  access token's `exp` claim and, if it has already passed, calls the existing
  `refresh()` flow *before* attaching the token and sending the request,
  instead of only reacting after a 401 comes back. The underlying heuristic is
  exported as `isJwtExpired(token)` for consumers who want it directly. This
  is a best-effort heuristic only (fails open on any decode error), not a
  security check, and the existing reactive 401 → refresh → retry-once path is
  unchanged as a fallback.
- Added opt-in structured request logging via `ApiClientOptions.logging`:
  `false` (default, off), `true` (built-in console logger), or a custom
  `(entry: RequestLogEntry) => void`. Implemented internally as an interceptor
  built on the package's own `onRequest`/`onResponse`/`onError` API, so it
  behaves exactly like any other interceptor a consumer could register.
- Added a new `useApiRequest` React hook, published as a separate
  `@mawsoftwares/api-client/react` subpath export so the base package still has
  no hard dependency on React (`react` is now an optional peer dependency).
  Consumers who don't import the `/react` subpath are unaffected.

### Patch Changes

- Fixed a session-restore deadlock: proactive `applyAuth()` refresh called
  `refresh()` → `postJson()` → `applyAuth()` again while the access token was
  still expired, so `GET /me` never left the browser and the web app stayed on
  "Loading...". Refresh is now single-flight (`inRefresh` + shared lock).
- Fixed an error-swallowing bug in the offline layer: `OfflineRepository`
  (`findAll`/`findById`/`create`/`update`/`remove`) and the GET-side fallback in
  `installOfflineInterceptor` previously caught *any* error from an online
  `client.request(...)` call — including genuine 4xx/5xx API error responses —
  and silently fell through to offline/local behavior. They now only fall
  through on a real connectivity failure (no HTTP status was ever received);
  a real HTTP error response propagates/throws normally so the caller knows
  the request actually failed server-side. The check is exported as
  `isConnectivityFailure(err)`.

## 0.1.1

### Patch Changes

- 636448d: Prepare packages for GitHub Packages so other product repos can install `@mawsoftwares/*` instead of linking this monorepo locally.
- Updated dependencies [636448d]
  - @mawsoftwares/sdk@0.1.1
