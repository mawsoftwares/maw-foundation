import type { MawModule, MawModuleDefinition } from '@mawsoftwares/server-express';
import { registry } from './index';

const DEFAULT_VERSION = '0.1.0';

/**
 * The sample's built-in modules (registered in `./index` at import time) as `MawModule`s, so they can be
 * switched on or off with `DISABLED_MODULES` exactly like a module plugged in from another package.
 * Definitions without a `version` get {@link DEFAULT_VERSION}.
 */
export function builtinModules(): readonly MawModule[] {
  return registry.getAll().map((definition) => {
    const versioned: MawModuleDefinition = { ...definition, version: definition.version ?? DEFAULT_VERSION };
    return { definition: versioned };
  });
}
