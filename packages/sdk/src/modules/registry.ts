/**
 * Module Registry — the central mechanism for managing modules.
 *
 * Handles registration, enable/disable, configuration, dependency validation,
 * lifecycle hooks, and discovery. Domain-specific registries (e.g. RBAC's
 * ModuleRegistry in @mawsoftwares/rbac-core) extend BaseModuleDefinition with their
 * own fields and delegate to this core registry for lifecycle management.
 */

import type {
  BaseModuleDefinition,
  ModuleState,
  ModuleStatus,
  ModuleMenuItem,
  ModuleRoute,
  ModuleEventDeclaration,
  ModuleMigration,
  ModuleLevel,
  ModuleConfigField,
} from './types';
import { createEventBus, type EventBus } from './events';

// ---------------------------------------------------------------------------
// Registry events
// ---------------------------------------------------------------------------

export const RegistryEvent = {
  MODULE_REGISTERED: 'module:registered',
  MODULE_ENABLED: 'module:enabled',
  MODULE_DISABLED: 'module:disabled',
  MODULE_CONFIGURED: 'module:configured',
  MODULE_ERROR: 'module:error',
} as const;

export interface RegistryEventPayload {
  moduleKey: string;
  status: ModuleStatus;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class BaseModuleRegistry<T extends BaseModuleDefinition = BaseModuleDefinition> {
  protected readonly states = new Map<string, ModuleState<T>>();
  readonly events: EventBus;

  constructor(events?: EventBus) {
    this.events = events ?? createEventBus();
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  register(...definitions: T[]): void {
    for (const def of definitions) {
      if (this.states.has(def.key)) {
        throw new Error(`Module "${def.key}" is already registered`);
      }
      const state: ModuleState<T> = {
        definition: def,
        status: 'registered',
        config: this.resolveDefaults(def),
      };
      this.states.set(def.key, state);

      if (def.lifecycle?.onRegister) {
        try {
          const result = def.lifecycle.onRegister();
          if (result instanceof Promise) {
            result.catch((err) => this.setError(def.key, err));
          }
        } catch (err) {
          this.setError(def.key, err);
        }
      }

      void this.events.emit(RegistryEvent.MODULE_REGISTERED, {
        moduleKey: def.key,
        status: 'registered',
      } satisfies RegistryEventPayload);
    }
  }

  // -----------------------------------------------------------------------
  // Enable / Disable
  // -----------------------------------------------------------------------

  async enable(key: string, config?: Record<string, unknown>): Promise<void> {
    const state = this.requireState(key);
    if (config) Object.assign(state.config, config);

    this.validateConfig(state);
    this.validateDependencies(key);

    if (state.definition.lifecycle?.onEnable) {
      await state.definition.lifecycle.onEnable();
    }
    if (state.definition.lifecycle?.onInit) {
      await state.definition.lifecycle.onInit(state.config);
    }

    state.status = 'enabled';
    await this.events.emit(RegistryEvent.MODULE_ENABLED, {
      moduleKey: key,
      status: 'enabled',
    } satisfies RegistryEventPayload);
  }

  async disable(key: string): Promise<void> {
    const state = this.requireState(key);

    const dependents = this.getDependents(key);
    const enabledDependents = dependents.filter((k) => this.states.get(k)?.status === 'enabled');
    if (enabledDependents.length > 0) {
      throw new Error(
        `Cannot disable "${key}" — required by enabled modules: ${enabledDependents.join(', ')}`,
      );
    }

    if (state.definition.lifecycle?.onDisable) {
      await state.definition.lifecycle.onDisable();
    }

    state.status = 'disabled';
    await this.events.emit(RegistryEvent.MODULE_DISABLED, {
      moduleKey: key,
      status: 'disabled',
    } satisfies RegistryEventPayload);
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  configure(key: string, config: Record<string, unknown>): void {
    const state = this.requireState(key);
    Object.assign(state.config, config);
    this.validateConfig(state);
    void this.events.emit(RegistryEvent.MODULE_CONFIGURED, {
      moduleKey: key,
      status: state.status,
    } satisfies RegistryEventPayload);
  }

  getConfig(key: string): Readonly<Record<string, unknown>> {
    return this.requireState(key).config;
  }

  // -----------------------------------------------------------------------
  // Discovery
  // -----------------------------------------------------------------------

  getAll(): readonly T[] {
    return [...this.states.values()].map((s) => s.definition);
  }

  getEnabled(): readonly T[] {
    return [...this.states.values()]
      .filter((s) => s.status === 'enabled')
      .map((s) => s.definition);
  }

  getDisabled(): readonly T[] {
    return [...this.states.values()]
      .filter((s) => s.status === 'disabled')
      .map((s) => s.definition);
  }

  getByKey(key: string): T | undefined {
    return this.states.get(key)?.definition;
  }

  getByLevel(level: ModuleLevel): readonly T[] {
    return this.getAll().filter((m) => m.level === level);
  }

  getState(key: string): Readonly<ModuleState<T>> | undefined {
    return this.states.get(key);
  }

  getStatus(key: string): ModuleStatus | undefined {
    return this.states.get(key)?.status;
  }

  isEnabled(key: string): boolean {
    return this.states.get(key)?.status === 'enabled';
  }

  isRegistered(key: string): boolean {
    return this.states.has(key);
  }

  get size(): number {
    return this.states.size;
  }

  // -----------------------------------------------------------------------
  // Aggregated queries
  // -----------------------------------------------------------------------

  getAllMenus(): readonly (ModuleMenuItem & { moduleKey: string })[] {
    const result: (ModuleMenuItem & { moduleKey: string })[] = [];
    for (const state of this.states.values()) {
      if (state.status !== 'enabled' && state.status !== 'registered') continue;
      for (const menu of state.definition.menus ?? []) {
        result.push({ ...menu, moduleKey: state.definition.key });
      }
    }
    return result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  getAllRoutes(): readonly (ModuleRoute & { moduleKey: string })[] {
    const result: (ModuleRoute & { moduleKey: string })[] = [];
    for (const state of this.states.values()) {
      if (state.status !== 'enabled' && state.status !== 'registered') continue;
      for (const route of state.definition.routes ?? []) {
        result.push({ ...route, moduleKey: state.definition.key });
      }
    }
    return result;
  }

  getAllEvents(): readonly (ModuleEventDeclaration & { moduleKey: string })[] {
    const result: (ModuleEventDeclaration & { moduleKey: string })[] = [];
    for (const state of this.states.values()) {
      for (const event of state.definition.events ?? []) {
        result.push({ ...event, moduleKey: state.definition.key });
      }
    }
    return result;
  }

  getAllMigrations(): readonly (ModuleMigration & { moduleKey: string })[] {
    const result: (ModuleMigration & { moduleKey: string })[] = [];
    for (const state of this.states.values()) {
      for (const migration of state.definition.migrations ?? []) {
        result.push({ ...migration, moduleKey: state.definition.key });
      }
    }
    return result.sort((a, b) => a.version.localeCompare(b.version));
  }

  // -----------------------------------------------------------------------
  // Dependency graph
  // -----------------------------------------------------------------------

  validateDependencies(key: string): void {
    const def = this.requireState(key).definition;
    for (const dep of def.dependencies ?? []) {
      const depState = this.states.get(dep.moduleKey);
      if (!depState) {
        if (dep.optional) continue;
        throw new Error(
          `Module "${key}" requires "${dep.moduleKey}" which is not registered`,
        );
      }
      if (depState.status === 'disabled' && !dep.optional) {
        throw new Error(
          `Module "${key}" requires "${dep.moduleKey}" which is disabled`,
        );
      }
    }
  }

  validateAllDependencies(): string[] {
    const errors: string[] = [];
    for (const key of this.states.keys()) {
      try {
        this.validateDependencies(key);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    return errors;
  }

  getDependencies(key: string): readonly string[] {
    const def = this.states.get(key)?.definition;
    if (!def) return [];
    return (def.dependencies ?? []).map((d) => d.moduleKey);
  }

  getDependents(key: string): readonly string[] {
    const result: string[] = [];
    for (const [k, state] of this.states) {
      if (k === key) continue;
      const deps = state.definition.dependencies ?? [];
      if (deps.some((d) => d.moduleKey === key && !d.optional)) {
        result.push(k);
      }
    }
    return result;
  }

  getInitOrder(): readonly string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (key: string) => {
      if (visited.has(key)) return;
      visited.add(key);
      const def = this.states.get(key)?.definition;
      for (const dep of def?.dependencies ?? []) {
        if (this.states.has(dep.moduleKey)) visit(dep.moduleKey);
      }
      order.push(key);
    };

    for (const key of this.states.keys()) visit(key);
    return order;
  }

  // -----------------------------------------------------------------------
  // Lifecycle: init all / destroy all
  // -----------------------------------------------------------------------

  async initAll(): Promise<void> {
    const order = this.getInitOrder();
    for (const key of order) {
      const state = this.states.get(key)!;
      if (state.status === 'disabled') continue;
      await this.enable(key, state.config);
    }
  }

  async destroyAll(): Promise<void> {
    const order = [...this.getInitOrder()].reverse();
    for (const key of order) {
      const state = this.states.get(key)!;
      if (state.definition.lifecycle?.onDestroy) {
        await state.definition.lifecycle.onDestroy();
      }
    }
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private requireState(key: string): ModuleState<T> {
    const state = this.states.get(key);
    if (!state) throw new Error(`Module "${key}" is not registered`);
    return state;
  }

  private resolveDefaults(def: T): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    for (const field of def.config?.fields ?? []) {
      if (field.default !== undefined) {
        config[field.key] = field.default;
      }
    }
    return config;
  }

  private validateConfig(state: ModuleState<T>): void {
    const fields: readonly ModuleConfigField[] = state.definition.config?.fields ?? [];
    for (const field of fields) {
      if (field.required && (state.config[field.key] === undefined || state.config[field.key] === '')) {
        throw new Error(
          `Module "${state.definition.key}" config: required field "${field.key}" is missing`,
        );
      }
    }
  }

  private setError(key: string, err: unknown): void {
    const state = this.states.get(key);
    if (!state) return;
    state.status = 'error';
    state.error = err instanceof Error ? err.message : String(err);
    void this.events.emit(RegistryEvent.MODULE_ERROR, {
      moduleKey: key,
      status: 'error',
    } satisfies RegistryEventPayload);
  }
}
