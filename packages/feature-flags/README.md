# @mawsoftwares/feature-flags

Tenant-aware feature flag foundation for the MAW ecosystem.

## Features

- **Scoped evaluation** — Global, environment, tenant, and user-level flags
- **Priority resolution** — User > Tenant > Environment > Global
- **Centralized service** — All flag checks go through `FeatureFlagService.isEnabled()`
- **Percentage rollouts** — `isRolledOut(userId, percentage)` for gradual rollout
- **Lightweight flag store** — In-memory `createFlagStore()` for simple use cases

## Usage

```ts
import { createFeatureFlagService } from '@mawsoftwares/feature-flags';

const flags = createFeatureFlagService();

flags.registerFlags(
  { key: 'ocr', name: 'OCR', defaultValue: false, scope: 'global' },
  { key: 'whatsapp', name: 'WhatsApp', defaultValue: false, scope: 'tenant' },
);

// Tenant A has OCR enabled
flags.addOverrides(
  { flagKey: 'ocr', scope: 'tenant', scopeId: 'tenant-a', enabled: true },
);

flags.isEnabled('ocr', { tenantId: 'tenant-a' }); // true
flags.isEnabled('ocr', { tenantId: 'tenant-b' }); // false (default)
```
