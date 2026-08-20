import pg from 'pg';
import { hashPassword } from '@maw/auth-core';
import { registry } from '../modules/index';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL first.');
  process.exit(1);
}

const TENANT = 'demo-tenant';

const users = [
  { id: 'u-superadmin', email: 'superadmin@demo.test', role: 'super_admin', audience: 'admin',    scopeId: null },
  { id: 'u-owner',      email: 'owner@demo.test',      role: 'owner',       audience: 'admin',    scopeId: null },
  { id: 'u-manager',    email: 'manager@demo.test',     role: 'manager',     audience: 'admin',    scopeId: 'plant-1' },
  { id: 'u-clerk',      email: 'clerk@demo.test',       role: 'clerk',       audience: 'operator', scopeId: 'plant-1' },
];

const roles = [
  { code: 'super_admin', name: 'Super Admin', sortOrder: -1 },
  { code: 'admin',       name: 'Admin',       sortOrder: 0 },
  { code: 'manager',     name: 'Manager',     sortOrder: 1 },
  { code: 'clerk',       name: 'Clerk',       sortOrder: 2 },
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

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  await client.query('BEGIN');

  // --- Users (001 tables) ---
  for (const u of users) {
    await client.query(
      `INSERT INTO users (id, tenant_id, email, role, audience, password_hash, scope_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, email) DO UPDATE SET
         role = EXCLUDED.role, audience = EXCLUDED.audience,
         password_hash = EXCLUDED.password_hash, scope_id = EXCLUDED.scope_id`,
      [u.id, TENANT, u.email, u.role, u.audience, hashPassword('password123'), u.scopeId],
    );
  }
  console.log(`[seed] ${users.length} users upserted.`);

  // --- Static role permissions (001 tables) ---
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
  console.log(`[seed] ${permCount} static role-permission rows upserted.`);

  // --- Dynamic RBAC: master_roles (002 tables) ---
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
  console.log(`[seed] ${roles.length} master roles upserted.`);

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
  console.log(`[seed] ${allPerms.length} master permissions upserted.`);

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
  console.log(`[seed] ${registry.getAll().length} master modules upserted.`);

  // --- Dynamic RBAC: role_permissions ---
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
  console.log(`[seed] ${rpCount} role-permission assignments upserted.`);

  await client.query('COMMIT');
  console.log('[seed] Done.');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  await client.end();
}
