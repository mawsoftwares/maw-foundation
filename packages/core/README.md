# @mawsoftwares/core

Framework-independent primitives for the MAW ecosystem.

## What's Inside

- **Result** — `ok()` / `err()` for type-safe error handling without exceptions
- **Error types** — `AppError`, `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`
- **Identifiers** — `generateId()`, `generateShortId()`, `isValidId()`
- **Money** — Integer minor-unit arithmetic (`createMoney`, `addMoney`, `formatMoney`)
- **Date/time** — `formatDate`, `parseDate`, `daysBetween`, `DateRange`
- **Pagination** — `PaginatedResult`, `paginate()`, `PaginationParams`
- **Constants** — `HttpStatus`, `EntityStatus`, `Limits`, `Duration`
- **Contracts (ports)** — `IAuthorization`, `IHasher`, `ISecureStore`, `IFileStorage`, etc.

## Usage

```ts
import { ok, err, generateId, AppError } from '@mawsoftwares/core';
```

## Architecture

`@mawsoftwares/core` is the bottom-most tier. It imports nothing from the MAW ecosystem.
All other packages may depend on it; it depends on none.
