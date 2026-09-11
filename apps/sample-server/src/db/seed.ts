import { createDatabasePool, closeDatabasePool, runSeed } from '@mawsoftwares/database';
import { hashPasswordForStorage } from '@mawsoftwares/auth-core';
import { createLogger } from '@mawsoftwares/sdk';
import { registry } from '../modules/index';

const log = createLogger('seed');

const TENANT = 'demo-tenant';

const users = [
  { id: 'u-superadmin', email: 'superadmin@demo.test', role: 'super_admin', audience: 'admin', scopeId: null as string | null, name: 'Super Admin' },
  { id: 'u-owner', email: 'owner@demo.test', role: 'owner', audience: 'admin', scopeId: null, name: 'Owner Demo' },
  { id: 'u-owner-maw', email: 'mindsatworksolutions@gmail.com', role: 'owner', audience: 'admin', scopeId: null, name: 'MAW Owner' },
  { id: 'u-owner-poonam', email: 'poonamdhomane89@gmail.com', role: 'owner', audience: 'admin', scopeId: null, name: 'Poonam Dhomane' },
  { id: 'u-manager', email: 'manager@demo.test', role: 'manager', audience: 'admin', scopeId: 'plant-1', name: 'Manager' },
  { id: 'u-clerk', email: 'clerk@demo.test', role: 'clerk', audience: 'operator', scopeId: 'plant-1', name: 'Clerk' },
];

const roles = [
  { code: 'super_admin', name: 'Super Admin', sortOrder: -1 },
  { code: 'owner',       name: 'Owner',       sortOrder: 0 },
  { code: 'admin',       name: 'Admin',       sortOrder: 1 },
  { code: 'manager',     name: 'Manager',     sortOrder: 2 },
  { code: 'clerk',       name: 'Clerk',       sortOrder: 3 },
  { code: 'viewer',      name: 'Viewer',      sortOrder: 4 },
];

const rolePermissionMap: Record<string, string[]> = {
  super_admin: [],
  admin:       [],
  manager: [
    'Read_Reports', 'Create_Reports',
    'Read_Orders', 'Create_Orders', 'Update_Orders',
    'Read_Inventory',
    'Create_Billing',
    'Read_AuditLogs',
  ],
  clerk: [
    'Read_Orders', 'Create_Orders',
    'Create_Billing',
  ],
};

const pool = await createDatabasePool();

try {
  await runSeed({ pool }, async (client) => {
    // --- Users (replace demo-tenant seed set so auth + users module stay aligned) ---
    await client.query(`DELETE FROM users WHERE tenant_id = $1`, [TENANT]);
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, tenant_id, email, role, audience, password_hash, scope_id, name, account_status, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', TRUE)`,
        [u.id, TENANT, u.email, u.role, u.audience, hashPasswordForStorage('password123'), u.scopeId, u.name],
      );
    }
    log.info('Users upserted', { count: users.length });

    // --- Static role permissions ---
    const staticPerms: Record<string, string[]> = {
      owner:   ['users.manage', 'settings.write', 'reports.view', 'reports.export', 'orders.view', 'orders.create', 'orders.edit', 'inventory.view', 'inventory.adjust', 'billing.create', 'payments.create'],
      manager: ['reports.view', 'reports.export', 'orders.view', 'orders.create', 'orders.edit', 'billing.create', 'payments.create'],
      clerk:   ['orders.view', 'orders.create', 'billing.create', 'payments.create'],
    };
    let permCount = 0;
    for (const [role, perms] of Object.entries(staticPerms)) {
      for (const perm of perms) {
        await client.query(
          `INSERT INTO tenant_role_permissions (tenant_id, role, permission)
           VALUES ($1, $2, $3)
           ON CONFLICT (tenant_id, role, permission) DO NOTHING`,
          [TENANT, role, perm],
        );
        permCount++;
      }
    }
    log.info('Static role-permission rows upserted', { count: permCount });

    // --- Dynamic RBAC: master_roles ---
    const roleIdMap: Record<string, number> = {};
    for (const r of roles) {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO master_roles (code, name, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [r.code, r.name, r.sortOrder],
      );
      roleIdMap[r.code] = rows[0]!.id;
    }
    log.info('Master roles upserted', { count: roles.length });

    // --- Dynamic RBAC: master_permissions (from module registry) ---
    const allPerms = registry.getAllPermissions();
    const permIdMap: Record<string, number> = {};
    for (const p of allPerms) {
      const name = p.code.split('_')[0] ?? p.code;
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO master_permissions (code, name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description
         RETURNING id`,
        [p.code, name, p.description ?? ''],
      );
      permIdMap[p.code] = rows[0]!.id;
    }
    log.info('Master permissions upserted', { count: allPerms.length });

    // --- Dynamic RBAC: master_modules ---
    const moduleIdMap: Record<string, number> = {};
    for (const m of registry.getAll()) {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO master_modules (code, name)
         VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [m.key, m.name],
      );
      moduleIdMap[m.key] = rows[0]!.id;
    }
    log.info('Master modules upserted', { count: registry.getAll().length });

    // --- Dynamic RBAC: module_permissions (links each module's own permissions to it,
    // so the Modules & Permissions admin screen shows them pre-attached rather than
    // starting from an empty tree) ---
    let modulePermCount = 0;
    for (const m of registry.getAll()) {
      const moduleId = moduleIdMap[m.key];
      if (moduleId === undefined) continue;
      for (const p of m.permissions ?? []) {
        const permId = permIdMap[p.code];
        if (permId === undefined) continue;
        await client.query(
          `INSERT INTO module_permissions (module_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (module_id, permission_id) DO NOTHING`,
          [moduleId, permId],
        );
        modulePermCount++;
      }
    }
    log.info('Module-permission links upserted', { count: modulePermCount });

    // --- Dynamic RBAC: role_permissions ---
    const allPermCodes = allPerms.map((p) => p.code);
    rolePermissionMap.super_admin = allPermCodes;
    rolePermissionMap.owner = allPermCodes;
    rolePermissionMap.admin = allPermCodes;

    let rpCount = 0;
    for (const [roleCode, permCodes] of Object.entries(rolePermissionMap)) {
      const roleId = roleIdMap[roleCode];
      if (roleId === undefined) continue;
      for (const pc of permCodes) {
        const permId = permIdMap[pc];
        if (permId === undefined) continue;
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id, module_id) DO NOTHING`,
          [roleId, permId],
        );
        rpCount++;
      }
    }
    log.info('Role-permission assignments upserted', { count: rpCount });

    // --- Menu items (admin-editable nav tree; mirrors the app's default navigation) ---
    // 'superadmin' is a parent item that groups the superadmin-only tools (RBAC, Menu
    // Management, Feature Flags, UI Showcase) behind one sidebar entry; the sample-web
    // Super Admin hub page renders them as cards instead of listing them at the top level.
    const menuItems: {
      key: string; label: string; path: string; icon: string;
      permission?: string; sortOrder: number; parentKey?: string;
    }[] = [
      { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard', sortOrder: 0 },
      { key: 'orders', label: 'Orders', path: '/orders', icon: 'shopping-cart', permission: 'Read_Orders', sortOrder: 10 },
      { key: 'reports', label: 'Reports', path: '/reports', icon: 'bar-chart', permission: 'Read_Reports', sortOrder: 20 },
      { key: 'inventory', label: 'Inventory', path: '/inventory', icon: 'clipboard-list', permission: 'Read_Inventory', sortOrder: 30 },
      { key: 'billing', label: 'Billing', path: '/billing', icon: 'credit-card', permission: 'Read_Billing', sortOrder: 40 },
      { key: 'users', label: 'Users', path: '/users', icon: 'users', permission: 'Read_Users', sortOrder: 50 },
      { key: 'audit-logs', label: 'Audit Logs', path: '/audit-logs', icon: 'scroll-text', permission: 'Read_AuditLogs', sortOrder: 60 },
      { key: 'account', label: 'Account', path: '/account', icon: 'lock', sortOrder: 70 },

      { key: 'superadmin', label: 'Super Admin', path: '/superadmin', icon: 'shield', sortOrder: 84 },
      { key: 'rbac', label: 'RBAC Admin', path: '/rbac', icon: 'key', permission: 'Manage_Rbac', sortOrder: 85, parentKey: 'superadmin' },
      { key: 'feature-flags', label: 'Feature Flags', path: '/feature-flags', icon: 'flag', permission: 'Read_FeatureFlags', sortOrder: 86, parentKey: 'superadmin' },
      { key: 'menus', label: 'Menu Management', path: '/menus', icon: 'menu', permission: 'Manage_Menus', sortOrder: 87, parentKey: 'superadmin' },
      { key: 'settings', label: 'Settings', path: '/settings', icon: 'settings', sortOrder: 90 },
      { key: 'platform', label: 'Platform', path: '/platform', icon: 'puzzle', sortOrder: 950 },
      { key: 'jobs', label: 'Jobs', path: '/jobs', icon: 'clock', sortOrder: 960 },
      { key: 'notifications', label: 'Notifications', path: '/notifications', icon: 'bell', sortOrder: 970 },
      { key: 'showcase', label: 'UI Showcase', path: '/showcase', icon: 'palette', sortOrder: 990, parentKey: 'superadmin' },
    ];
    let menuCount = 0;
    const menuIdByKey: Record<string, number> = {};
    for (const m of menuItems) {
      const parentId = m.parentKey ? menuIdByKey[m.parentKey] ?? null : null;
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO menu_items (key, label, path, icon, permission, sort_order, parent_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (key) DO UPDATE SET
           label = EXCLUDED.label, path = EXCLUDED.path, icon = EXCLUDED.icon,
           permission = EXCLUDED.permission, sort_order = EXCLUDED.sort_order, parent_id = EXCLUDED.parent_id
         RETURNING id`,
        [m.key, m.label, m.path, m.icon, m.permission ?? null, m.sortOrder, parentId],
      );
      menuIdByKey[m.key] = rows[0]!.id;
      menuCount++;
    }
    log.info('Menu items upserted', { count: menuCount });
  });

  log.info('Seed complete.');
} finally {
  await closeDatabasePool(pool);
}
