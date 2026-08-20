# Hosting topology kit (portable)

Copy this entire `deployment/topology/` folder when you reuse the deployment kit in another project.

## Contents

| File / folder                                    | Purpose                                                |
| ------------------------------------------------ | ------------------------------------------------------ |
| [TOPOLOGY_SWITCHING.md](./TOPOLOGY_SWITCHING.md) | Short guide — what to change per approach              |
| `samples/frontend/`                              | Example `app.config.json` + `.env.example` for the SPA |
| `samples/backend/`                               | Example `app.config.json` + `.env.example` for the API |

## Approaches

| Approach                  | URLs                                | Frontend sample                               | Backend sample                                 |
| ------------------------- | ----------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| **A — Shared subpath**    | `domain.com/app/` + `/app/api`      | `samples/frontend/approach-a-shared-subpath/` | `samples/backend/approach-a-proxied-subpath/`  |
| **B — Dedicated domains** | `app.domain.com` + `api.domain.com` | `samples/frontend/approach-b-dedicated-root/` | `samples/backend/approach-b-dedicated-domain/` |

## Use in a new project

1. Copy `deployment/` (frontend and/or backend repo).
2. Pick approach **A** or **B** (use matching frontend + backend samples).
3. Copy sample files into `deployment/environments/<env>/`:
   - `app.config.json` → merge with your server/SSH/DB settings
   - `.env.example` → copy to `.env` and fill secrets
4. Read [TOPOLOGY_SWITCHING.md](./TOPOLOGY_SWITCHING.md) for the field checklist.
5. Approach **B** adds **one isolated nginx vhost per hostname**
   (`/home/deploy/nginx/vhosts-enabled/{domain}.conf`) — it must not edit other
   apps on the same server. Approach **A** adds a location snippet under the
   shared parent only.
6. Run `validate-config` + `--dry-run` before deploy.

Topology logic is implemented in `deployment/scripts/utils/topology.js` (same path in frontend and backend kits).

## Environment folders (ready-made templates)

| Folder | Approach | Use case |
| ------ | -------- | -------- |
| `environments/development/` | **B** dedicated domains | Dev server / early integration |
| `environments/staging/` | **A** shared subpath | UAT on shared host |
| `environments/production/` | **B** dedicated domains | Live production |
| `environments/client-a/` | **B** dedicated domains | Tenant / white-label template |
| `environments/client-b/` | **B** dedicated domains | Second tenant template |

Each folder has `app.config.json` + `.env.example` (and `.env` where needed). Replace `your-domain.com`, paths, ports, and secrets before deploy.
