# @mawsoftwares/express

Express framework adapter for the MAW ecosystem.

Re-exports authentication and RBAC middleware from `@mawsoftwares/server-express`. Only Express-specific functionality belongs in this package.

## Usage

```ts
import { requireAuth, requirePermission, audienceGuard } from '@mawsoftwares/express';
```
