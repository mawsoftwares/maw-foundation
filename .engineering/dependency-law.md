# Dependency Law (enforced by `eslint.config.js`)

```
apps
  → ui-web | ui-native | api-client | server-express | server-hono
      → auth-core | rbac-core
          → platform
              → config | tenancy | modules | feature-flags
                  → core
                      → sdk        (imports nothing of ours)
```

Each tier may import only tiers **below** it. Violations fail `pnpm lint` via
`no-restricted-imports` patterns (see `eslint.config.js`).

Adapters (`adapters/express`, `adapters/hono`, `adapters/postgres`) wrap their
corresponding `packages/` implementations and are exempt from layering.

| Package | May import | Must NOT import |
|---|---|---|
| `@mawsoftwares/sdk` | (nothing of ours) | everything above |
| `@mawsoftwares/core` | `sdk` | everything above |
| `@mawsoftwares/config` | `sdk`, `core` | everything above |
| `@mawsoftwares/tenancy` | `sdk`, `core` | everything above |
| `@mawsoftwares/modules` | `sdk`, `core` | everything above |
| `@mawsoftwares/feature-flags` | `sdk`, `core` | everything above |
| `@mawsoftwares/database` | `sdk` | platform/rbac/auth/adapters/api/ui |
| `@mawsoftwares/platform` | `sdk` | rbac/auth/adapters/api/ui |
| `@mawsoftwares/rbac-core` | `sdk` | auth/adapters/api/ui/platform |
| `@mawsoftwares/auth-core` | `sdk`, `platform` | adapters/api/ui |
| `@mawsoftwares/server-express` | `sdk`, `platform`, `auth-core`, `rbac-core` | the other adapter, ui |
| `@mawsoftwares/server-hono` | `sdk`, `platform`, `auth-core`, `rbac-core` | the other adapter, ui |
| `@mawsoftwares/api-client` | `sdk`, `rbac-core` | adapters, ui |
| `@mawsoftwares/theme` | `sdk` | everything else |
| `@mawsoftwares/ui-web` | `sdk`, `rbac-core`, `theme`, `api-client` | adapters, `ui-native` |
| `@mawsoftwares/ui-native` | `sdk`, `rbac-core`, `theme`, `api-client` | adapters, `ui-web` |
| `apps/*` | anything | — (composition roots) |

**Why two UI kits, not one:** React web components (Radix/shadcn/Tailwind + DOM) and
React Native components (`View`/`Text`/`StyleSheet`) cannot share a render tree. So the
foundation shares everything *below* the view layer (auth, RBAC, API client, tokens) and
splits only the views. `@mawsoftwares/theme` holds platform-agnostic **token values** that both
kits consume, so the two look identical without sharing components.
