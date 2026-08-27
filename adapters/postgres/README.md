# @mawsoftwares/postgres

PostgreSQL infrastructure adapter for the MAW ecosystem.

Re-exports connection pool, repository base, query builder, tenant-scoped repository, migration runner, and health checks from `@mawsoftwares/database`.

## Usage

```ts
import { createPool, BaseRepository, TenantScopedRepository } from '@mawsoftwares/postgres';
```
