# @mawsoftwares/feature-flags

Tenant-aware feature flag foundation for the MAW ecosystem.

## Features

- **Scoped evaluation** — global, environment, product, tenant and user overrides (`ON` / `OFF` / `INHERIT`)
- **Priority resolution** — user > tenant > product > environment > global > the flag's default
- **Evaluation pipeline** — scope → schedule → targeting rules → percentage rollout → dependencies, each with a reported reason
- **Dependencies** — `REQUIRES` / `CONFLICTS_WITH` other flags; shared dependencies are fine, real cycles fail closed
- **Safe failure** — if evaluation throws, `failClosed` flags go off and the rest use their default
- **Pluggable storage** — `FeatureFlagRepository` (Postgres, cached, or `InMemoryFeatureFlagRepository`)

## Usage

```ts
import {
  FeatureFlagService, FeatureRegistry, PipelineEvaluator, InMemoryFeatureFlagRepository,
  FlagScope, FlagState, RiskLevel,
} from '@mawsoftwares/feature-flags';

const ocr = { key: 'ocr', name: 'OCR', defaultValue: false, isActive: true, failClosed: true, riskLevel: RiskLevel.LOW };

const repository = new InMemoryFeatureFlagRepository().setDefinition(ocr);
const registry = new FeatureRegistry();
registry.register(ocr);
const flags = new FeatureFlagService(new PipelineEvaluator(repository), registry);

// Tenant A has OCR enabled
repository.setOverrides('ocr', [{ flagKey: 'ocr', scope: FlagScope.TENANT, scopeId: 'tenant-a', state: FlagState.ON }]);

await flags.isEnabled('ocr', { tenantId: 'tenant-a' }); // true
await flags.isEnabled('ocr', { tenantId: 'tenant-b' }); // false (default)
await flags.evaluate('ocr', { tenantId: 'tenant-a' });  // { enabled: true, reason: 'TENANT_OVERRIDE', scope: 'TENANT', ... }
```

In production use `PostgresFeatureFlagRepository` (optionally wrapped in `CachedFeatureFlagRepository`) instead of the in-memory one.

Percentage rollouts: `isRolledOut(id, percentage, salt?)` from `@mawsoftwares/sdk`; pass the flag key as `salt` so different flags select different users.
