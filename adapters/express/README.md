# @maw/express

Express framework adapter for the MAW ecosystem.

Re-exports authentication and RBAC middleware from `@maw/server-express`. Only Express-specific functionality belongs in this package.

## Usage

```ts
import { requireAuth, requirePermission, audienceGuard } from '@maw/express';
```
