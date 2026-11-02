/**
 * Plug-and-play module host: the backend half of the module contract.
 * A module is a `MawModule` (Foundation `ModuleDefinition` + version + optional routes/role grants).
 * An application builds its Express app in `createApp` (never listening), registers modules with
 * `installModules`/`registerModules`, mounts them with `mountModuleRoutes`, and starts with
 * `listenWithGracefulShutdown`. See docs/plug-and-play.md.
 */
export type { MawModule, MawModuleDefinition, ModuleContext, ModuleHostServices } from './contract';
export {
  ModuleConfigurationError,
  installModules,
  mountModuleRoutes,
  registerModules,
  type ModuleSelection,
} from './registration';
export { selectionFromDisabled } from './selection';
export { collectRoleGrants } from './grants';
export { requireModuleEnabled } from './gate';
export { EnvironmentError, parseModuleList, readDisabledModules } from './env';
export {
  listenWithGracefulShutdown,
  resolveModuleSelection,
  type ListenOptions,
  type RunningServer,
  type ServableApp,
} from './serve';
