# @maw/hono

Hono framework adapter for the MAW ecosystem.

Re-exports security middleware from `@maw/server-hono`. Only Hono-specific functionality belongs in this package.

## Usage

```ts
import { securityPipeline, errorHandler, cors } from '@maw/hono';
```
