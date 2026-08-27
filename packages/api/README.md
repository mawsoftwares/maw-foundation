# @mawsoftwares/api

Framework-agnostic API foundation for MAW projects. Provides a standard response envelope, controller contract, error translation, DTO conventions, pagination/filtering/sorting, idempotency, and OpenAPI metadata — all without coupling to Express or Hono.

## Architecture

```
Route → Middleware (auth, validation) → Controller → DTO → Service → Repository
         ↑ framework adapter               ↑ framework-agnostic (@mawsoftwares/api)
```

## Response Contract

### Success

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601",
    "pagination": { "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 }
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Order not found",
    "details": [{ "field": "id", "message": "invalid format" }],
    "requestId": "uuid"
  }
}
```

## Controller Contract

Controllers are framework-agnostic async functions:

```ts
import type { Controller } from '@mawsoftwares/api';
import { ok, created, errorResult } from '@mawsoftwares/api';

const getUser: Controller = async ({ params, context }) => {
  const user = await userService.findById(params.id);
  if (!user) return errorResult('NOT_FOUND', 'User not found');
  return ok(user);
};

const createUser: Controller = async ({ body, context }) => {
  const user = await userService.create(body);
  return created(user, 'User created');
};
```

## Express Adapter

```ts
import { createApiRouter, populateRequestContext, correlationIdMiddleware, createRequestLogger } from '@mawsoftwares/server-express';

// Global middleware (after security pipeline)
app.use(correlationIdMiddleware());
app.use(createRequestLogger({ logger: log, ignorePaths: ['/health'] }));
app.use(populateRequestContext());

// Module router
const { router, get, post } = createApiRouter({ version: 'v1', prefix: '/api/v1/users' });
get('/', listUsers, { middleware: [requireAuth], metadata: { summary: 'List users', tags: ['users'] } });
post('/', createUser, { middleware: [requireAuth, requirePermission('Create_Users')] });
app.use('/api/v1/users', router);
```

## Hono Adapter

```ts
import { createApiRouter, populateRequestContext, correlationIdMiddleware, createRequestLogger } from '@mawsoftwares/server-hono';

app.use(correlationIdMiddleware());
app.use(createRequestLogger({ logger: log }));
app.use(populateRequestContext());

const { app: ordersApp, get, post } = createApiRouter({ version: 'v1' });
get('/', listOrders, { middleware: [requireAuth] });
app.route('/api/v1/orders', ordersApp);
```

## Error Handling

All `AppError` instances thrown inside a controller are automatically caught by `withErrorTranslation` and converted to the standard error envelope. The global error handler (`createGlobalErrorHandler`) also uses the standard envelope.

## Pagination / Sorting / Filtering

```ts
import { parseListQuery } from '@mawsoftwares/api/dto/query-parser';

// In a controller:
const { page, pageSize, sortBy, sortOrder, search } = parseListQuery(query, {
  allowedSortFields: ['name', 'createdAt'],
});
```

## Idempotency

```ts
import { IdempotencyService, MemoryIdempotencyStore } from '@mawsoftwares/api';

const store = new MemoryIdempotencyStore();
const idempotency = new IdempotencyService(store);

// In a controller:
const result = await idempotency.process(idempotencyKey, () => orderService.create(body));
```

## Test Helpers

```ts
import { assertSuccessEnvelope, assertErrorEnvelope, createMockRequestContext } from '@mawsoftwares/api/testing';
```

## Dependency Law

`@mawsoftwares/api` imports only `@mawsoftwares/sdk`. Framework adapters (`@mawsoftwares/server-express`, `@mawsoftwares/server-hono`) import `@mawsoftwares/api`.
