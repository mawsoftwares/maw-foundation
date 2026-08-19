import pg from 'pg';
import { hashPassword } from '@maw/auth-core';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL first.');
  process.exit(1);
}

const TENANT = 'demo-tenant';

const users = [
  { id: 'u-owner',   email: 'owner@demo.test',   role: 'owner',   audience: 'admin',    scopeId: null },
  { id: 'u-manager', email: 'manager@demo.test', role: 'manager', audience: 'admin',    scopeId: 'plant-1' },
  { id: 'u-clerk',   email: 'clerk@demo.test',   role: 'clerk',   audience: 'operator', scopeId: 'plant-1' },
];

const rolePermissions: Record<string, string[]> = {
  owner:   ['users.manage', 'settings.write', 'reports.view', 'reports.export', 'orders.view', 'orders.create', 'orders.edit', 'inventory.view', 'inventory.adjust', 'billing.create', 'payments.create'],
  manager: ['reports.view', 'reports.export', 'orders.view', 'orders.create', 'orders.edit', 'billing.create', 'payments.create'],
  clerk:   ['orders.view', 'orders.create', 'billing.create', 'payments.create'],
};

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  await client.query('BEGIN');

  // Upsert users
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

  // Upsert role permissions
  let permCount = 0;
  for (const [role, perms] of Object.entries(rolePermissions)) {
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
  console.log(`[seed] ${permCount} role-permission rows upserted.`);

  await client.query('COMMIT');
  console.log('[seed] Done.');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  await client.end();
}
