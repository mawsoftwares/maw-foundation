# Dependency Law (enforced by `eslint.config.js`)

```
apps
  → ui-web | ui-native | api-client | server-express | server-hono
      → auth-core | rbac-core
          → platform
              → sdk        (imports nothing of ours)
```

Each tier may import only tiers **below** it. Violations fail `npm run lint` via
`no-restricted-imports` patterns (see `eslint.config.js`).

| Package | May import | Must NOT import |
|---|---|---|
| `@maw/sdk` | (nothing of ours) | everything above |
| `@maw/platform` | `sdk` | rbac/auth/adapters/api/ui |
| `@maw/rbac-core` | `sdk` | auth/adapters/api/ui/platform |
| `@maw/auth-core` | `sdk`, `platform` | adapters/api/ui |
| `@maw/server-express` | `sdk`, `platform`, `auth-core`, `rbac-core` | the other adapter, ui |
| `@maw/server-hono` | `sdk`, `platform`, `auth-core`, `rbac-core` | the other adapter, ui |
| `@maw/api-client` | `sdk`, `rbac-core` | adapters, ui |
| `@maw/theme` | `sdk` | everything else |
| `@maw/ui-web` | `sdk`, `rbac-core`, `theme`, `api-client` | adapters, `ui-native` |
| `@maw/ui-native` | `sdk`, `rbac-core`, `theme`, `api-client` | adapters, `ui-web` |
| `apps/*` | anything | — (composition roots) |

**Why two UI kits, not one:** React web components (Radix/shadcn/Tailwind + DOM) and
React Native components (`View`/`Text`/`StyleSheet`) cannot share a render tree. So the
foundation shares everything *below* the view layer (auth, RBAC, API client, tokens) and
splits only the views. `@maw/theme` holds platform-agnostic **token values** that both
kits consume, so the two look identical without sharing components.
