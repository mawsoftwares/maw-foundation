# Plug-and-play modules

A product module (leads, inventory, service requests, ...) can **run on its own** and can also be **mounted into a host app** next to other modules. Each module can be switched on or off by configuration. Foundation supplies the contract and the helpers, so every new project gets this without copying code.

```
        standalone                              integrated
   ┌──────────────────┐                ┌──────────────────────────────┐
   │ module app       │                │ host app (e.g. BASE)         │
   │  createApp()     │                │  createApp()                 │
   │  + listen        │                │   ├─ module A  (MawModule)   │
   └──────────────────┘                │   ├─ module B  (MawModule)   │
                                       │   └─ module C  (MawModule)   │
                                       └──────────────────────────────┘
   same module code, same API paths, same permissions in both modes
```

Nothing new is invented: the contract is the existing `ModuleDefinition` / `ModuleRegistry` plus a version and an optional route hook.

## Where the pieces live

| Piece | Package | Entry |
|---|---|---|
| Backend contract and helpers | `@mawsoftwares/server-express` | `MawModule`, `installModules`, `registerModules`, `mountModuleRoutes`, `resolveModuleSelection`, `collectRoleGrants`, `requireModuleEnabled`, `listenWithGracefulShutdown`, `EnvironmentError`, `readDisabledModules` |
| Frontend contract and helpers | `@mawsoftwares/ui-web` | `FrontendModule`, `FrontendModuleState`, `disabledModuleKeys`, `hiddenNavKeys`, `moduleOfPage`, `modulePermissions`, `assertConsistent`, `assertStateConsistent` |
| Vite helpers for hosts | `@mawsoftwares/ui-web-tailwind/vite` | `mawHostSingletons`, `mawHostFsAllow`, `HOST_DEDUPE` |

Reference implementation: `apps/sample-server` (`app.ts`, `start.ts`, `env.ts`, `modules/pluggable.ts`) and `apps/sample-web` (`src/module/index.ts`, `vite.config.ts`).

## Backend

### 1. Split the app from the server

`createApp(options)` builds the Express app and **never listens**. It returns `{ app, port, shutdown }` (the `ServableApp` shape). `start()` reads the environment, calls `createApp`, then `listenWithGracefulShutdown`. `main.ts` only loads `.env` and calls `start()`.

```ts
// start.ts
const env = readServerEnv();
const modules = [...builtinModules(), ...extraModules];
const moduleSelection = resolveModuleSelection(modules, env.disabledModules); // refuses unknown keys
const mawApp = await createApp({ ...env, modules, moduleSelection });
return listenWithGracefulShutdown(mawApp, { onListening: () => log.info('ready') });
```

Why: a host can mount `app` in its own server, and tests can build the app without a port. `shutdown()` must be idempotent and release timers, job runners and the pool.

### 2. Declare a module

```ts
import type { MawModule } from '@mawsoftwares/server-express';

export const exampleModule: MawModule = {
  definition: {            // the existing ModuleDefinition, with `version` required
    key: 'example', name: 'Example', version: '0.1.0', routePrefix: '/api/v1/example',
    dependencies: [{ moduleKey: 'users' }],
  },
  roleGrants: { manager: ['Read_Example'] },          // default grants when a database is seeded
  registerRoutes: ({ router, requireAuth, requirePermission }) => {
    router.get('/', requireAuth, requirePermission('Read_Example'), (_req, res) => { res.json({ items: [] }); });
  },
};
```

A module never calls `listen`, never reads secrets, and gets only `router`, `log`, `requireAuth`, `requirePermission` and its resolved `config` from the host.

### 3. Register and mount (inside `createApp`)

```ts
const enabled = await installModules(registry, options.modules ?? [], options.moduleSelection);
await syncModules(data.syncStore, registry, syncLog);       // permissions
...
mountModuleRoutes(app, registry, enabled, { log, requireAuth, requirePermission });
app.use(securityErrorHandler);                              // error handler stays last
```

- `registerModules` is strict: duplicate keys, an already-registered key, a bad semver version, a missing or disabled required dependency, or an unknown enabled key all raise one `ModuleConfigurationError` listing every problem. Validation runs before the registry is touched.
- `installModules` additionally accepts modules whose definitions were registered at import time (the common case in existing apps) and only enables or disables them.
- Not enforced (the registry cannot): dependency `minVersion` and dependency cycles.

### 4. Turn modules off

`DISABLED_MODULES=billing,reports` (comma separated). An unknown key stops startup with an `EnvironmentError`, so a typo never leaves a module silently on. A disabled module:

- has status `disabled` in `GET /modules`;
- is missing from login `entitlements` / `modules` and from the menu list;
- has no routes mounted (404).

Routes an app mounts itself (not through `registerRoutes`) are gated with `requireModuleEnabled(registry, key)`: `app.use('/api/v1/tasks', requireModuleEnabled(registry, 'tasks'), router)` answers 404 while the module is disabled.

Caution: `syncModules` deletes permissions that are not in the registry it is given. Running a smaller module list against a shared database removes the other modules' permissions. Keep one module list per database.

## Frontend

A `FrontendModule` is the UI half of a backend module with the same `key`:

```ts
export const exampleFrontend: FrontendModule = {
  key: 'example', version: '0.1.0',
  nav: [{ key: 'example', label: 'Example', icon: 'briefcase', path: '/example', group: 'Main', sortOrder: 20 }],
  pagePermissions: { example: 'Read_Example' },
  pages: { example: () => <ExamplePage /> },
};
```

Redux slices and middleware go in a separate `FrontendModuleState<Reducer, Middleware>` (Foundation does not depend on Redux, so the app supplies the types). The host's `App.tsx`:

- adds `FRONTEND_MODULES.flatMap(m => m.nav)` to the sidebar and `modulePermissions(FRONTEND_MODULES)` to its permission map;
- renders `moduleOfPage(FRONTEND_MODULES, page)?.pages[page]()`, or "Module disabled" when `disabledModuleKeys(catalog)` contains the module (the catalog is `GET /modules`);
- hides `hiddenNavKeys(...)` entries from the sidebar;
- builds its store from the modules' reducers and middleware, then calls each `onStoreReady(store)`.

## Hosting several module apps in one frontend

When the module apps are linked into a host (pnpm `link:` path dependencies), each app brings its own `api`, `config`, users API and page paths. In `vite.config.ts`:

```ts
import { HOST_DEDUPE, mawHostFsAllow, mawHostSingletons } from '@mawsoftwares/ui-web-tailwind/vite';

const opts = { hostSrc: new URL('./src', import.meta.url).pathname, moduleSrcDirs: [/* each module's frontend/src */] };
plugins: [mawHostSingletons(opts), react()],
resolve: { dedupe: [...HOST_DEDUPE] },
server: { fs: { allow: mawHostFsAllow(opts) } },
```

`apps/sample-web` turns this on with `MAW_HOST_MODULES=/abs/a/frontend/src,/abs/b/frontend/src`.

Styling rules learned in the first integration:

- The host must define Tailwind's layer order first (import the host stylesheet before anything else in `main.tsx`), otherwise a module that imports Tailwind itself puts `base` above `utilities` and its pages lose their styles.
- Use the host's `@source` rules so Tailwind scans the module apps' files.
- Icons come from `ui-web`'s `Icon`; add any missing one there instead of patching a copy.

## Adding a module to a project

1. Backend: write the `MawModule` (`definition` with `version`, optional `registerRoutes`, optional `roleGrants`) and add it to the module list `start()` passes to `createApp`.
2. Frontend: write the `FrontendModule` (+ state) and add it to `FRONTEND_MODULES`.
3. Same `key` and `version` on both sides.
4. Run `db:setup` so permissions and role grants are seeded.
5. Test: module off (`DISABLED_MODULES`) hides it in the sidebar and returns 404 for its routes.

`scripts/generate-module.mjs` still scaffolds CRUD modules; they register in `modules/index.ts` and `builtinModules()` makes them switchable automatically.

## Limits

- Module business data in some products is still mock or browser storage; mounting a module does not make it production-ready.
- One database per module list (see the `syncModules` caution).
- Distribution to other teams or customers needs each module published as a versioned package; path links only work with the repos side by side.
