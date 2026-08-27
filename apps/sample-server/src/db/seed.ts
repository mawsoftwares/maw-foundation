import { createDatabasePool, closeDatabasePool, runSeed } from '@mawsoftwares/database';
import { hashPassword } from '@mawsoftwares/auth-core';
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
        [u.id, TENANT, u.email, u.role, u.audience, hashPassword('password123'), u.scopeId, u.name],
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
    for (const m of registry.getAll()) {
      await client.query(
        `INSERT INTO master_modules (code, name)
         VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
        [m.key, m.name],
      );
    }
    log.info('Master modules upserted', { count: registry.getAll().length });

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
  });

  log.info('Seed complete.');
} finally {
  await closeDatabasePool(pool);
}
