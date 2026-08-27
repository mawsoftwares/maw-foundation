# @mawsoftwares/config

Central configuration foundation for the MAW ecosystem.

## Features

- **Multi-level Config Engine** — Layered configuration (Environment → App → Tenant → Module → User) with deep merge and change notifications
- **Typed Env Utilities** — `getEnv()`, `getRequiredEnv()`, `getEnvInt()`, `getEnvBool()`, `loadTypedConfig()`
- **Config Schemas** — `AppConfig`, `TenantConfig`, `UIConfig` with sensible defaults
- **Health Checker** — Composable health-check builder with PG, Redis, and HTTP check factories
- **Version Utilities** — Semver parsing, comparison, and build info

## Usage

```ts
import { createConfigEngine, getRequiredEnv, type AppConfig } from '@mawsoftwares/config';

const config = createConfigEngine();
config.loadLayer('app', {
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  timezone: 'Asia/Kolkata',
});

config.get('currency'); // → 'INR'
```

## Architecture

`@mawsoftwares/config` depends only on `@mawsoftwares/core`. It is framework-agnostic and works on Node, browser, and React Native.
