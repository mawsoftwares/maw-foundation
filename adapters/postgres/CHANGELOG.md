# @mawsoftwares/postgres

## 0.2.0

### Minor Changes

- bb4dc84: `PgTenantRepository` moved from `@mawsoftwares/tenancy` to `@mawsoftwares/postgres` (tenancy no longer depends on the database
  layer, as the dependency law requires): `import { PgTenantRepository } from '@mawsoftwares/postgres'`.
  feature-flags: dependency checks no longer treat a shared dependency (A needs B and C, both need D) as circular; evaluators import
  their enums from the right module; added `InMemoryFeatureFlagRepository`; README updated to the current API.
  sdk: `isRolledOut(id, percentage, salt?)` accepts an optional salt (the flag key) so flags roll out to different users; two-argument calls are unchanged.

### Patch Changes

- Updated dependencies [bb4dc84]
  - @mawsoftwares/tenancy@0.2.0
  - @mawsoftwares/database@0.2.1

## 0.1.2

### Patch Changes

- Updated dependencies [74103ab]
  - @mawsoftwares/database@0.2.0

## 0.1.1

### Patch Changes

- 636448d: Prepare packages for GitHub Packages so other product repos can install `@mawsoftwares/*` instead of linking this monorepo locally.
- Updated dependencies [636448d]
  - @mawsoftwares/database@0.1.1
