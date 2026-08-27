/**
 * Base module types — the contract every module in the MAW ecosystem satisfies.
 *
 * The Module Registry is the central mechanism for managing modules across
 * the 4-level architecture (Foundation → Business Platform → Optional Engines
 * → Project Logic). Packages like @mawsoftwares/rbac-core extend these base types
 * with domain-specific fields (permissions, features).
 */

// ---------------------------------------------------------------------------
// Module identity
// ---------------------------------------------------------------------------

export type ModuleLevel = 'foundation' | 'platform' | 'engine' | 'project';

export interface ModuleMetadata {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly version?: string;
  readonly level?: ModuleLevel;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ModuleConfigField {
  readonly key: string;
  readonly type: 'string' | 'number' | 'boolean' | 'json';
  readonly required?: boolean;
  readonly default?: unknown;
  readonly description?: string;
}

export interface ModuleConfigSchema {
  readonly fields: readonly ModuleConfigField[];
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface ModuleDependency {
  readonly moduleKey: string;
  readonly optional?: boolean;
  readonly minVersion?: string;
}

// ---------------------------------------------------------------------------
// Navigation / Menus
// ---------------------------------------------------------------------------

export interface ModuleMenuItem {
  readonly label: string;
  readonly path: string;
  readonly icon?: string;
  readonly group?: string;
  readonly sortOrder?: number;
  readonly badge?: string;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export interface ModuleRoute {
  readonly path: string;
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly description?: string;
  readonly public?: boolean;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface ModuleEventDeclaration {
  readonly name: string;
  readonly description?: string;
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

export interface ModuleMigration {
  readonly version: string;
  readonly description?: string;
  readonly path?: string;
  readonly up: string | (() => Promise<void>);
  readonly down?: string | (() => Promise<void>);
}

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

export interface ModuleLifecycle {
  onRegister?(): void | Promise<void>;
  onEnable?(): void | Promise<void>;
  onDisable?(): void | Promise<void>;
  onInit?(config: Record<string, unknown>): void | Promise<void>;
  onDestroy?(): void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Complete Module Definition
// ---------------------------------------------------------------------------

export interface BaseModuleDefinition extends ModuleMetadata {
  readonly dependencies?: readonly ModuleDependency[];
  readonly config?: ModuleConfigSchema;
  readonly routes?: readonly ModuleRoute[];
  readonly menus?: readonly ModuleMenuItem[];
  readonly events?: readonly ModuleEventDeclaration[];
  readonly migrations?: readonly ModuleMigration[];
  readonly lifecycle?: ModuleLifecycle;
}

// ---------------------------------------------------------------------------
// Module state (runtime)
// ---------------------------------------------------------------------------

export type ModuleStatus = 'registered' | 'enabled' | 'disabled' | 'error';

export interface ModuleState<T extends BaseModuleDefinition = BaseModuleDefinition> {
  readonly definition: T;
  status: ModuleStatus;
  config: Record<string, unknown>;
  error?: string;
}
