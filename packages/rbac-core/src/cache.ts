import type { MasterData, RbacRole, RbacPermission, RbacModule, ModulePermission } from './module-types';

/**
 * Cache store port — the cache loads master data through this interface.
 * Implement with your DB client of choice.
 */
export interface ICacheStore {
  loadRoles(): Promise<RbacRole[]>;
  loadPermissions(): Promise<RbacPermission[]>;
  loadModules(): Promise<RbacModule[]>;
  loadModulePermissions(): Promise<ModulePermission[]>;
  loadRolePermissions(roleId: number): Promise<string[]>;
}

export interface CacheLogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string, err?: unknown): void;
}

const noop: CacheLogger = { info() {}, warn() {}, error() {} };

/**
 * In-memory cache of master RBAC data (roles, permissions, modules), loaded from DB
 * on boot and auto-refreshed on a configurable interval.
 *
 * Ported from Sushmapet's MasterCacheService — stripped of domain-specific tables
 * (statuses, userGroups, categoryTypes, dropdownOptions, featureFlags) that belong in
 * product code, keeping only the RBAC-relevant core.
 */
export class MasterCache {
  private data: MasterData | null = null;
  private lastRefresh: Date | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly refreshMs: number;
  private readonly store: ICacheStore;
  private readonly logger: CacheLogger;

  constructor(store: ICacheStore, refreshMs = 5 * 60 * 1000, logger: CacheLogger = noop) {
    this.store = store;
    this.refreshMs = refreshMs;
    this.logger = logger;
  }

  async load(): Promise<MasterData> {
    const [roles, permissions, modules, modulePermissions] = await Promise.all([
      this.store.loadRoles(),
      this.store.loadPermissions(),
      this.store.loadModules(),
      this.store.loadModulePermissions(),
    ]);
    this.data = { roles, permissions, modules, modulePermissions };
    this.lastRefresh = new Date();
    this.logger.info('Master RBAC cache loaded');
    return this.data;
  }

  getCache(): MasterData | null {
    return this.data;
  }

  async ensureLoaded(): Promise<MasterData> {
    if (this.data !== null) return this.data;
    return this.load();
  }

  shouldRefresh(): boolean {
    if (this.lastRefresh === null) return true;
    return Date.now() - this.lastRefresh.getTime() > this.refreshMs;
  }

  startAutoRefresh(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      if (this.shouldRefresh()) {
        this.load().catch((err) => this.logger.error('Cache refresh failed', err));
      }
    }, this.refreshMs);
    this.logger.info('Master cache auto-refresh started');
  }

  stopAutoRefresh(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getRoleByCode(code: string): RbacRole | undefined {
    return this.data?.roles.find((r) => r.code === code);
  }

  getRoleById(id: number): RbacRole | undefined {
    return this.data?.roles.find((r) => r.id === id);
  }

  getPermissionByCode(code: string): RbacPermission | undefined {
    return this.data?.permissions.find((p) => p.code === code);
  }

  getPermissionById(id: number): RbacPermission | undefined {
    return this.data?.permissions.find((p) => p.id === id);
  }

  getModuleByCode(code: string): RbacModule | undefined {
    return this.data?.modules.find((m) => m.code === code);
  }

  getPermissionsForModule(moduleId: number): RbacPermission[] {
    if (this.data === null) return [];
    const permIds = this.data.modulePermissions
      .filter((mp) => mp.moduleId === moduleId)
      .map((mp) => mp.permissionId);
    return this.data.permissions.filter((p) => permIds.includes(p.id));
  }

  async getUserPermissions(roleId: number): Promise<string[]> {
    return this.store.loadRolePermissions(roleId);
  }
}
