---
'@mawsoftwares/tenancy': minor
'@mawsoftwares/postgres': minor
'@mawsoftwares/feature-flags': patch
'@mawsoftwares/sdk': patch
---

`PgTenantRepository` moved from `@mawsoftwares/tenancy` to `@mawsoftwares/postgres` (tenancy no longer depends on the database
layer, as the dependency law requires): `import { PgTenantRepository } from '@mawsoftwares/postgres'`.
feature-flags: dependency checks no longer treat a shared dependency (A needs B and C, both need D) as circular; evaluators import
their enums from the right module; added `InMemoryFeatureFlagRepository`; README updated to the current API.
sdk: `isRolledOut(id, percentage, salt?)` accepts an optional salt (the flag key) so flags roll out to different users; two-argument calls are unchanged.
