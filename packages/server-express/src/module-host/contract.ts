import type { Router, RequestHandler } from 'express';
import type { ModuleDefinition } from '@mawsoftwares/rbac-core';
import type { Logger } from '@mawsoftwares/sdk';

/**
 * Module contract = the existing Foundation `ModuleDefinition` (identity, version, dependencies,
 * permissions, menus, routes metadata, migrations, lifecycle) plus a typed route-registration hook.
 * Nothing here replaces `ModuleRegistry`; see `registration.ts` for how it is driven.
 */

/** `ModuleDefinition.version` is optional in the SDK; a pluggable module must declare one. */
export type MawModuleDefinition = ModuleDefinition & { readonly version: string };

/** Everything a module may use when registering routes. The host owns construction of these. */
export interface ModuleContext {
  /** Module-private router; the host mounts it at `definition.routePrefix`. */
  readonly router: Router;
  readonly log: Logger;
  readonly requireAuth: RequestHandler;
  readonly requirePermission: (code: string) => RequestHandler;
  /** Resolved module configuration (defaults + overrides) from the registry. */
  readonly config: Readonly<Record<string, unknown>>;
}

/** Dependencies supplied by the host; `router` and `config` are added per module. */
export type ModuleHostServices = Omit<ModuleContext, 'router' | 'config'>;

export interface MawModule {
  readonly definition: MawModuleDefinition;
  /**
   * Permissions this module grants to roles by default when a database is seeded (role code -> permission
   * codes). Roles that hold every permission (super_admin, owner, admin) need no entry.
   */
  readonly roleGrants?: Readonly<Record<string, readonly string[]>>;
  /** Absent for modules without backend routes yet. Must not call `listen` or touch global state. */
  readonly registerRoutes?: (context: ModuleContext) => void;
}
