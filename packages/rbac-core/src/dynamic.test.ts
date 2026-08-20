import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleRegistry } from './registry';
import { syncPermissions, type ISyncStore } from './sync';
import { MasterCache, type ICacheStore } from './cache';
import { resolvePermission, createPermissions, isAdminRole, matchesPermission } from './permission-resolver';
import { checkPermissionDynamic } from './check-permission';
import type { PermissionDefinition } from './module-types';

// ---------------------------------------------------------------------------
// ModuleRegistry
// ---------------------------------------------------------------------------

describe('ModuleRegistry', () => {
  it('registers modules and collects all permissions', () => {
    const reg = new ModuleRegistry();
    reg.register(
      { key: 'users', name: 'Users', routePrefix: '/api/users', permissions: [{ code: 'read_users', name: 'Read Users' }] },
      { key: 'orders', name: 'Orders', routePrefix: '/api/orders', permissions: [{ code: 'read_orders', name: 'Read Orders' }, { code: 'create_orders', name: 'Create Orders' }] },
    );
    expect(reg.getAll()).toHaveLength(2);
    expect(reg.getAllPermissions()).toHaveLength(3);
    expect(reg.getAllPermissions()[0]!.moduleKey).toBe('users');
  });

  it('rejects duplicate keys', () => {
    const reg = new ModuleRegistry();
    reg.register({ key: 'users', name: 'Users', routePrefix: '/api/users' });
    expect(() => reg.register({ key: 'users', name: 'Users v2', routePrefix: '/api/users2' })).toThrow('already registered');
  });

  it('filters by audience', () => {
    const reg = new ModuleRegistry();
    reg.register(
      { key: 'admin-mod', name: 'Admin', routePrefix: '/api/admin', audience: 'admin' },
      { key: 'op-mod', name: 'Operator', routePrefix: '/api/op', audience: 'operator' },
      { key: 'shared-mod', name: 'Shared', routePrefix: '/api/shared', audience: 'shared' },
    );
    expect(reg.getByAudience('admin').map((m) => m.key)).toEqual(['admin-mod', 'shared-mod']);
    expect(reg.getByAudience('operator').map((m) => m.key)).toEqual(['op-mod', 'shared-mod']);
  });

  it('collects feature syncs with module key', () => {
    const reg = new ModuleRegistry();
    reg.register({
      key: 'reports',
      name: 'Reports',
      routePrefix: '/api/reports',
      featureSync: { code: 'reports', name: 'Reports', groupCode: 'analytics', routePath: '/reports' },
    });
    const feats = reg.getAllFeatureSyncs();
    expect(feats).toHaveLength(1);
    expect(feats[0]!.moduleKey).toBe('reports');
  });
});

// ---------------------------------------------------------------------------
// syncPermissions
// ---------------------------------------------------------------------------

describe('syncPermissions', () => {
  function mockSyncStore(): ISyncStore {
    const perms = new Map<string, { id: number; description: string | null }>();
    let nextId = 1;
    return {
      findPermissionByCode: async (code) => perms.get(code) ?? null,
      insertPermission: async (code, desc) => { perms.set(code, { id: nextId++, description: desc }); },
      updatePermissionDescription: async (code, desc) => { const p = perms.get(code); if (p) p.description = desc; },
      listAllPermissionCodes: async () => [...perms.entries()].map(([code, p]) => ({ id: p.id, code })),
      countRoleAssignmentsForPermission: async () => 0,
      deletePermission: async (id) => { for (const [code, p] of perms) { if (p.id === id) perms.delete(code); } },
      findFeatureByCode: async () => null,
      insertFeature: async () => {},
      updateFeature: async () => {},
      listAllFeatureCodes: async () => [],
      countTenantAssignmentsForFeature: async () => 0,
      deleteFeature: async () => {},
    };
  }

  it('inserts new permissions', async () => {
    const store = mockSyncStore();
    const perms: PermissionDefinition[] = [
      { code: 'read_users', name: 'Read', description: 'Read users' },
      { code: 'create_users', name: 'Create', description: 'Create users' },
    ];
    const result = await syncPermissions(store, perms);
    expect(result.inserted).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.deleted).toBe(0);
  });

  it('updates changed descriptions', async () => {
    const store = mockSyncStore();
    await syncPermissions(store, [{ code: 'read_users', name: 'Read', description: 'Old desc' }]);
    const result = await syncPermissions(store, [{ code: 'read_users', name: 'Read', description: 'New desc' }]);
    expect(result.updated).toBe(1);
    expect(result.inserted).toBe(0);
  });

  it('deletes obsolete permissions not assigned to roles', async () => {
    const store = mockSyncStore();
    await syncPermissions(store, [
      { code: 'keep', name: 'Keep' },
      { code: 'remove', name: 'Remove' },
    ]);
    const result = await syncPermissions(store, [{ code: 'keep', name: 'Keep' }]);
    expect(result.deleted).toBe(1);
  });

  it('skips delete when permission is still assigned to roles', async () => {
    const store = mockSyncStore();
    await syncPermissions(store, [{ code: 'assigned', name: 'Assigned' }]);
    store.countRoleAssignmentsForPermission = async () => 2;
    const result = await syncPermissions(store, []);
    expect(result.skipped).toBe(1);
    expect(result.deleted).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// MasterCache
// ---------------------------------------------------------------------------

describe('MasterCache', () => {
  function mockCacheStore(): ICacheStore {
    return {
      loadRoles: async () => [
        { id: 1, code: 'admin', name: 'Admin', isActive: true, sortOrder: 0 },
        { id: 2, code: 'manager', name: 'Manager', isActive: true, sortOrder: 1 },
      ],
      loadPermissions: async () => [
        { id: 10, code: 'read', name: 'Read', isActive: true, sortOrder: 0 },
        { id: 11, code: 'write', name: 'Write', isActive: true, sortOrder: 1 },
        { id: 12, code: 'delete', name: 'Delete', isActive: true, sortOrder: 2 },
      ],
      loadModules: async () => [
        { id: 100, code: 'users', name: 'Users', parentModuleId: null, isActive: true, sortOrder: 0 },
      ],
      loadModulePermissions: async () => [
        { id: 1, moduleId: 100, permissionId: 10 },
        { id: 2, moduleId: 100, permissionId: 11 },
      ],
      loadRolePermissions: async (roleId) => {
        if (roleId === 2) return ['10_Users', '11_Users'];
        return [];
      },
    };
  }

  it('loads and caches data', async () => {
    const cache = new MasterCache(mockCacheStore());
    const data = await cache.load();
    expect(data.roles).toHaveLength(2);
    expect(data.permissions).toHaveLength(3);
    expect(cache.getCache()).toBe(data);
  });

  it('lookups work after load', async () => {
    const cache = new MasterCache(mockCacheStore());
    await cache.load();
    expect(cache.getRoleByCode('admin')?.id).toBe(1);
    expect(cache.getPermissionByCode('read')?.id).toBe(10);
    expect(cache.getModuleByCode('users')?.id).toBe(100);
    expect(cache.getPermissionsForModule(100)).toHaveLength(2);
  });

  it('getUserPermissions delegates to store', async () => {
    const cache = new MasterCache(mockCacheStore());
    await cache.load();
    const perms = await cache.getUserPermissions(2);
    expect(perms).toEqual(['10_Users', '11_Users']);
  });
});

// ---------------------------------------------------------------------------
// Permission resolver + matching
// ---------------------------------------------------------------------------

describe('permission-resolver', () => {
  let cache: MasterCache;

  beforeEach(async () => {
    cache = new MasterCache({
      loadRoles: async () => [{ id: 1, code: 'admin', name: 'Admin', isActive: true, sortOrder: 0 }],
      loadPermissions: async () => [
        { id: 10, code: 'read', name: 'Read', isActive: true, sortOrder: 0 },
        { id: 11, code: 'write', name: 'Write', isActive: true, sortOrder: 1 },
      ],
      loadModules: async () => [
        { id: 100, code: 'users', name: 'Users', parentModuleId: null, isActive: true, sortOrder: 0 },
      ],
      loadModulePermissions: async () => [],
      loadRolePermissions: async () => [],
    });
    await cache.load();
  });

  it('resolves permission to id_module format', () => {
    expect(resolvePermission(cache, 'Read', 'Users')).toBe('10_Users');
  });

  it('falls back Create→Write', () => {
    expect(resolvePermission(cache, 'Create', 'Users')).toBe('11_Users');
  });

  it('createPermissions helper works', () => {
    const p = createPermissions(cache);
    expect(p.read('Users')).toBe('10_Users');
    expect(p.write('Users')).toBe('11_Users');
  });

  it('matchesPermission with case-insensitive module', () => {
    const userPerms = ['10_Users', '11_Users'];
    expect(matchesPermission(userPerms, 'Read_Users', cache)).toBe(true);
    expect(matchesPermission(userPerms, 'Read_users', cache)).toBe(true);
    expect(matchesPermission(userPerms, 'Delete_Users', cache)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAdminRole
// ---------------------------------------------------------------------------

describe('isAdminRole', () => {
  it('recognises admin codes', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('ADMIN')).toBe(true);
    expect(isAdminRole('super_admin')).toBe(true);
    expect(isAdminRole('superadmin')).toBe(true);
    expect(isAdminRole('manager')).toBe(false);
  });

  it('recognises admin names', () => {
    expect(isAdminRole('mgr', 'Admin')).toBe(true);
    expect(isAdminRole('mgr', 'Super Admin')).toBe(true);
    expect(isAdminRole('mgr', 'Manager')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkPermissionDynamic
// ---------------------------------------------------------------------------

describe('checkPermissionDynamic', () => {
  let cache: MasterCache;

  beforeEach(async () => {
    cache = new MasterCache({
      loadRoles: async () => [
        { id: 1, code: 'admin', name: 'Admin', isActive: true, sortOrder: 0 },
        { id: 2, code: 'manager', name: 'Manager', isActive: true, sortOrder: 1 },
      ],
      loadPermissions: async () => [
        { id: 10, code: 'read', name: 'Read', isActive: true, sortOrder: 0 },
      ],
      loadModules: async () => [
        { id: 100, code: 'users', name: 'Users', parentModuleId: null, isActive: true, sortOrder: 0 },
      ],
      loadModulePermissions: async () => [],
      loadRolePermissions: async (roleId) => {
        if (roleId === 2) return ['10_Users'];
        return [];
      },
    });
    await cache.load();
  });

  it('admin role bypasses all checks', async () => {
    const result = await checkPermissionDynamic(
      { userId: 'u1', roleId: 1 },
      'Read_Users',
      cache,
    );
    expect(result.granted).toBe(true);
    expect(result.reason).toBe('admin_bypass');
  });

  it('manager with permission is granted', async () => {
    const result = await checkPermissionDynamic(
      { userId: 'u2', roleId: 2, permissions: ['10_Users'] },
      'Read_Users',
      cache,
    );
    expect(result.granted).toBe(true);
    expect(result.reason).toBe('permission_match');
  });

  it('manager without permission is denied', async () => {
    const result = await checkPermissionDynamic(
      { userId: 'u2', roleId: 2, permissions: [] },
      'Read_Users',
      cache,
    );
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('denied');
  });

  it('no role returns no_role', async () => {
    const result = await checkPermissionDynamic(
      { userId: 'u3' },
      'Read_Users',
      cache,
    );
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('no_role');
  });

  it('loads permissions from cache when not provided', async () => {
    const result = await checkPermissionDynamic(
      { userId: 'u2', roleId: 2 },
      'Read_Users',
      cache,
    );
    expect(result.granted).toBe(true);
    expect(result.reason).toBe('permission_match');
  });
});
