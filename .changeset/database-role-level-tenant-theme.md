---
'@mawsoftwares/database': minor
---

Schema: `master_roles.level` (role hierarchy rank used by `rbac-core` and the PHP backend) and the new `tenant_theme` table (`schema.tenantTheme`). These were committed to the repo but never released, so consumers of the published package could not use role hierarchy or per-tenant themes.
