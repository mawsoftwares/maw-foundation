# MAW Foundation — Development Guide

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** (install via `corepack enable` or `npm install -g pnpm`)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/maw-foundation.git
cd maw-foundation

# Install all dependencies
pnpm install

# Run all verification checks
pnpm verify
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint with dependency law enforcement |
| `pnpm test` | Run all tests with Vitest |
| `pnpm build` | Build all packages |
| `pnpm verify` | Run typecheck + lint + test |
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting without modifying |
| `pnpm sample:server` | Start the Express proof backend |
| `pnpm sample:web` | Start the Vite React proof app |

## Creating a New Package

1. Create the directory under `packages/<name>/`:
   ```
   packages/<name>/
     package.json
     tsconfig.json
     src/
       index.ts
     tests/
     README.md
   ```

2. Set `"name": "@maw/<name>"` in `package.json`

3. Add the `exports` field:
   ```json
   {
     "exports": {
       ".": "./src/index.ts"
     }
   }
   ```

4. Add path mapping in `tsconfig.base.json`

5. Add alias in `vitest.config.ts`

6. Add dependency rules in `eslint.config.js`

7. Add to `tsconfig.json` include list

## Testing

Tests use [Vitest](https://vitest.dev/) and are co-located with source files or in `tests/` directories.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm vitest

# Run tests for a specific package
pnpm vitest packages/config
```

## Dependency Rules

The dependency law is enforced by ESLint. See `.engineering/dependency-law.md`.

**Rule**: Each tier may only import tiers below it. Violations fail `pnpm lint`.

```
sdk (imports nothing of ours)
  ↑
core / config
  ↑
platform / tenancy / modules / feature-flags
  ↑
rbac-core / auth-core
  ↑
server-express / server-hono (framework-specific)
  ↑
apps (composition roots)
```
