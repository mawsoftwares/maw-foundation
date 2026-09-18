import { Router, type Request, type RequestHandler } from 'express';
import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, and, sql, count } from 'drizzle-orm';
import type { MasterCache } from '@mawsoftwares/rbac-core';
import type { IAuditStore } from '@mawsoftwares/audit';
import type { DynamicAuthedRequest } from '@mawsoftwares/server-express';
import { buildRoleWorkspace, type PermissionRow, type ModuleRow } from './rbac-workspace';

function toRoleDto(r: typeof schema.masterRoles.$inferSelect) {
  return { id: r.id, code: r.code, name: r.name, description: r.description, isActive: r.isActive, sortOrder: r.sortOrder };
}
function toPermissionDto(r: typeof schema.masterPermissions.$inferSelect) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    isActive: r.isActive,
    isSystem: r.isSystem,
    sortOrder: r.sortOrder,
  };
}
function toModuleDto(r: typeof schema.masterModules.$inferSelect, systemModuleCodes: ReadonlySet<string>) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    parentModuleId: r.parentModuleId,
    isActive: r.isActive,
    isSystem: systemModuleCodes.has(r.code),
    sortOrder: r.sortOrder,
  };
}

function pgCode(err: unknown): string | undefined {
  let current: unknown = err;
  for (let i = 0; i < 5 && current && typeof current === 'object'; i++) {
    const rec = current as { code?: unknown; cause?: unknown };
    if (typeof rec.code === 'string' && /^\d{5}$/.test(rec.code)) return rec.code;
    current = rec.cause;
  }
  return undefined;
}

export interface RbacRouterOptions {
  readonly systemModuleCodes?: readonly string[];
  readonly systemPermissionCodes?: readonly string[];
  readonly auditStore?: IAuditStore;
}

function auditRbac(
  auditStore: IAuditStore | undefined,
  req: Request,
  action: string,
  resource: string,
  resourceId: string | undefined,
  details: Record<string, unknown>,
): void {
  if (!auditStore) return;
  const maw = (req as DynamicAuthedRequest).maw;
  if (!maw) return;
  void auditStore.record({
    tenantId: maw.claims.tenantId,
    userId: maw.claims.userId,
    action,
    resource,
    resourceId,
    details,
    ip: req.ip,
  });
}

export function createRbacRouter(
  db: DrizzleDb,
  cache: MasterCache,
  requirePermission: (perm: string) => RequestHandler,
  options: RbacRouterOptions = {},
): Router {
  const router = Router();
  const systemModuleCodes = new Set(options.systemModuleCodes ?? []);
  const systemPermissionCodes = new Set(options.systemPermissionCodes ?? []);
  const auditStore = options.auditStore;

  const isSystemPermission = (row: { isSystem: boolean; code: string }) =>
    row.isSystem || systemPermissionCodes.has(row.code);

  // Every RBAC-management route is gated behind one permission - this router manages
  // roles/permissions/modules/module-permission assignments, all equally sensitive.
  router.use(requirePermission('Manage_Rbac'));

  // --- Roles CRUD ---
  router.get('/roles', async (_req, res) => {
    try {
      const rows = await db.select().from(schema.masterRoles).orderBy(schema.masterRoles.sortOrder);
      res.json({ data: rows.map(toRoleDto) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/roles', async (req, res) => {
    try {
      const { code, name, description, sortOrder } = req.body;
      const rows = await db
        .insert(schema.masterRoles)
        .values({ code, name, description: description || null, sortOrder: sortOrder || 0 })
        .returning();
      await cache.load();
      auditRbac(auditStore, req, 'ROLE_CREATED', 'rbac.role', String(rows[0]!.id), { code, name });
      res.status(201).json({ data: toRoleDto(rows[0]!) });
    } catch (err) {
      if (pgCode(err) === '23505') {
        return void res.status(409).json({ error: 'A role with this code already exists.' });
      }
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/roles/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, sortOrder, isActive } = req.body;
      const rows = await db
        .update(schema.masterRoles)
        .set({ name, description: description || null, sortOrder: sortOrder || 0, isActive: isActive !== false, updatedAt: new Date() })
        .where(eq(schema.masterRoles.id, Number(id)))
        .returning();
      await cache.load();
      auditRbac(auditStore, req, 'ROLE_UPDATED', 'rbac.role', id, { name, isActive });
      res.json({ data: toRoleDto(rows[0]!) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/roles/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(schema.masterRoles).where(eq(schema.masterRoles.id, Number(id)));
      await cache.load();
      auditRbac(auditStore, req, 'ROLE_DELETED', 'rbac.role', id, {});
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Composite workspace (role + modules + permissions + assignments) ---
  router.get('/roles/:id/workspace', async (req, res) => {
    try {
      const roleId = Number(req.params.id);
      const roleRows = await db.select().from(schema.masterRoles).where(eq(schema.masterRoles.id, roleId));
      const role = roleRows[0];
      if (!role) {
        return void res.status(404).json({ error: 'Role not found' });
      }

      const [modules, permissions, links, assignedRows, assignmentCountRows] = await Promise.all([
        db.select().from(schema.masterModules).orderBy(schema.masterModules.sortOrder),
        db.select().from(schema.masterPermissions).orderBy(schema.masterPermissions.sortOrder),
        db.select().from(schema.modulePermissions),
        db
          .select({ permissionId: schema.rolePermissions.permissionId })
          .from(schema.rolePermissions)
          .where(eq(schema.rolePermissions.roleId, roleId)),
        db
          .select({
            permissionId: schema.rolePermissions.permissionId,
            count: count(),
          })
          .from(schema.rolePermissions)
          .groupBy(schema.rolePermissions.permissionId),
      ]);

      const assignmentCounts = new Map<number, number>();
      for (const row of assignmentCountRows) {
        assignmentCounts.set(row.permissionId, Number(row.count));
      }

      const workspace = buildRoleWorkspace({
        role: toRoleDto(role),
        modules: modules.map((m) => toModuleDto(m, systemModuleCodes) as ModuleRow),
        permissions: permissions.map((p) => ({
          ...toPermissionDto(p),
          isSystem: isSystemPermission(p),
        })) as PermissionRow[],
        modulePermissions: links.map((l) => ({ moduleId: l.moduleId, permissionId: l.permissionId })),
        assignedPermissionIds: new Set(assignedRows.map((r) => r.permissionId)),
        assignmentCounts,
      });

      res.json({ data: workspace });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Permissions CRUD ---
  router.get('/permissions', async (_req, res) => {
    try {
      const rows = await db.select().from(schema.masterPermissions).orderBy(schema.masterPermissions.sortOrder);
      res.json({ data: rows.map((r) => ({ ...toPermissionDto(r), isSystem: isSystemPermission(r) })) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/permissions/:id/assignments', async (req, res) => {
    try {
      const permissionId = Number(req.params.id);
      const rows = await db
        .select({
          id: schema.masterRoles.id,
          code: schema.masterRoles.code,
          name: schema.masterRoles.name,
        })
        .from(schema.rolePermissions)
        .innerJoin(schema.masterRoles, eq(schema.masterRoles.id, schema.rolePermissions.roleId))
        .where(eq(schema.rolePermissions.permissionId, permissionId));
      const unique = new Map(rows.map((r) => [r.id, r]));
      res.json({ data: { count: unique.size, roles: [...unique.values()] } });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/permissions', async (req, res) => {
    try {
      const { code, name, description, sortOrder } = req.body as {
        code?: string; name?: string; description?: string; sortOrder?: number;
      };
      if (!code || !name) {
        return void res.status(400).json({ error: 'code and name are required' });
      }
      const existing = await db
        .select({ id: schema.masterPermissions.id })
        .from(schema.masterPermissions)
        .where(sql`lower(${schema.masterPermissions.code}) = ${code.toLowerCase()}`);
      if (existing[0]) {
        return void res.status(409).json({ error: 'Permission code already exists.' });
      }
      const rows = await db
        .insert(schema.masterPermissions)
        .values({ code, name, description: description || null, sortOrder: sortOrder || 0, isSystem: false })
        .returning();
      await cache.load();
      auditRbac(auditStore, req, 'PERMISSION_CREATED', 'rbac.permission', String(rows[0]!.id), { code, name });
      res.status(201).json({ data: toPermissionDto(rows[0]!) });
    } catch (err) {
      if (pgCode(err) === '23505') {
        return void res.status(409).json({ error: 'Permission code already exists.' });
      }
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/permissions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, sortOrder, isActive, code } = req.body as {
        name?: string; description?: string; sortOrder?: number; isActive?: boolean; code?: string;
      };
      const currentRows = await db.select().from(schema.masterPermissions).where(eq(schema.masterPermissions.id, Number(id)));
      const current = currentRows[0];
      if (!current) {
        return void res.status(404).json({ error: 'Permission not found' });
      }
      const system = isSystemPermission(current);
      const nextCode = system || !code ? current.code : code;
      if (nextCode !== current.code) {
        const clash = await db
          .select({ id: schema.masterPermissions.id })
          .from(schema.masterPermissions)
          .where(sql`lower(${schema.masterPermissions.code}) = ${nextCode.toLowerCase()}`);
        if (clash[0] && clash[0].id !== current.id) {
          return void res.status(409).json({ error: 'Permission code already exists.' });
        }
      }
      const rows = await db
        .update(schema.masterPermissions)
        .set({
          name: name ?? current.name,
          description: description === undefined ? current.description : description || null,
          sortOrder: sortOrder ?? current.sortOrder,
          isActive: isActive !== false,
          code: nextCode,
          updatedAt: new Date(),
        })
        .where(eq(schema.masterPermissions.id, Number(id)))
        .returning();
      await cache.load();
      auditRbac(auditStore, req, 'PERMISSION_UPDATED', 'rbac.permission', id, {
        old: { name: current.name, code: current.code, isActive: current.isActive },
        new: { name: rows[0]!.name, code: rows[0]!.code, isActive: rows[0]!.isActive },
      });
      res.json({ data: { ...toPermissionDto(rows[0]!), isSystem: isSystemPermission(rows[0]!) } });
    } catch (err) {
      if (pgCode(err) === '23505') {
        return void res.status(409).json({ error: 'Permission code already exists.' });
      }
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/permissions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const currentRows = await db.select().from(schema.masterPermissions).where(eq(schema.masterPermissions.id, Number(id)));
      const current = currentRows[0];
      if (!current) {
        return void res.status(404).json({ error: 'Permission not found' });
      }
      if (isSystemPermission(current)) {
        return void res.status(403).json({ error: 'System permissions cannot be deleted.' });
      }
      const assigned = await db
        .select({ count: count() })
        .from(schema.rolePermissions)
        .where(eq(schema.rolePermissions.permissionId, Number(id)));
      await db.delete(schema.masterPermissions).where(eq(schema.masterPermissions.id, Number(id)));
      await cache.load();
      auditRbac(auditStore, req, 'PERMISSION_DELETED', 'rbac.permission', id, {
        code: current.code,
        name: current.name,
        assignedRoles: Number(assigned[0]?.count ?? 0),
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Modules CRUD ---
  router.get('/modules', async (_req, res) => {
    try {
      const rows = await db.select().from(schema.masterModules).orderBy(schema.masterModules.sortOrder);
      res.json({ data: rows.map((r) => toModuleDto(r, systemModuleCodes)) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/modules', async (req, res) => {
    try {
      const { code, name, description, sortOrder, parentModuleId, permissions } = req.body as {
        code?: string;
        name?: string;
        description?: string;
        sortOrder?: number;
        parentModuleId?: number;
        permissions?: { code: string; name: string; description?: string; sortOrder?: number }[];
      };
      if (!code || !name) {
        return void res.status(400).json({ error: 'code and name are required' });
      }

      const duplicate = await db
        .select({ id: schema.masterModules.id })
        .from(schema.masterModules)
        .where(sql`lower(${schema.masterModules.code}) = ${code.toLowerCase()}`);
      if (duplicate[0]) {
        return void res.status(409).json({ error: 'Module already exists.' });
      }

      const created = await db.transaction(async (tx) => {
        const rows = await tx
          .insert(schema.masterModules)
          .values({
            code,
            name,
            description: description || null,
            sortOrder: sortOrder || 0,
            parentModuleId: parentModuleId || null,
          })
          .returning();
        const moduleRow = rows[0]!;
        const createdPerms: ReturnType<typeof toPermissionDto>[] = [];

        for (const perm of permissions ?? []) {
          if (!perm.code || !perm.name) continue;
          const existingPerm = await tx
            .select()
            .from(schema.masterPermissions)
            .where(sql`lower(${schema.masterPermissions.code}) = ${perm.code.toLowerCase()}`);
          let permRow = existingPerm[0];
          if (!permRow) {
            const inserted = await tx
              .insert(schema.masterPermissions)
              .values({
                code: perm.code,
                name: perm.name,
                description: perm.description || null,
                sortOrder: perm.sortOrder || 0,
                isSystem: false,
              })
              .returning();
            permRow = inserted[0];
          }
          if (!permRow) continue;
          await tx
            .insert(schema.modulePermissions)
            .values({ moduleId: moduleRow.id, permissionId: permRow.id })
            .onConflictDoNothing({ target: [schema.modulePermissions.moduleId, schema.modulePermissions.permissionId] });
          createdPerms.push(toPermissionDto(permRow));
        }

        return { module: moduleRow, permissions: createdPerms };
      });

      await cache.load();
      auditRbac(auditStore, req, 'MODULE_CREATED', 'rbac.module', String(created.module.id), {
        code,
        name,
        permissions: created.permissions.map((p) => p.code),
      });
      res.status(201).json({
        data: { ...toModuleDto(created.module, systemModuleCodes), permissions: created.permissions },
      });
    } catch (err) {
      if (pgCode(err) === '23505') {
        return void res.status(409).json({ error: 'Module already exists.' });
      }
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/modules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, sortOrder, isActive, parentModuleId } = req.body;
      const currentRows = await db.select().from(schema.masterModules).where(eq(schema.masterModules.id, Number(id)));
      const current = currentRows[0];
      if (!current) {
        return void res.status(404).json({ error: 'Module not found' });
      }
      const rows = await db
        .update(schema.masterModules)
        .set({
          name,
          description: description || null,
          sortOrder: sortOrder || 0,
          isActive: isActive !== false,
          parentModuleId: parentModuleId || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.masterModules.id, Number(id)))
        .returning();
      await cache.load();
      const action = current.isActive && isActive === false ? 'MODULE_DEACTIVATED' : 'MODULE_UPDATED';
      auditRbac(auditStore, req, action, 'rbac.module', id, {
        old: { name: current.name, isActive: current.isActive },
        new: { name: rows[0]!.name, isActive: rows[0]!.isActive },
      });
      res.json({ data: toModuleDto(rows[0]!, systemModuleCodes) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/modules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const currentRows = await db.select().from(schema.masterModules).where(eq(schema.masterModules.id, Number(id)));
      const current = currentRows[0];
      if (!current) {
        return void res.status(404).json({ error: 'Module not found' });
      }
      if (systemModuleCodes.has(current.code)) {
        return void res.status(403).json({ error: 'System modules cannot be deleted. Deactivate them instead.' });
      }
      await db.delete(schema.masterModules).where(eq(schema.masterModules.id, Number(id)));
      await cache.load();
      auditRbac(auditStore, req, 'MODULE_DELETED', 'rbac.module', id, { code: current.code, name: current.name });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Module tree with attached permissions ---
  router.get('/modules/tree', async (_req, res) => {
    try {
      const [modules, links, permissions] = await Promise.all([
        db.select().from(schema.masterModules).orderBy(schema.masterModules.sortOrder),
        db.select().from(schema.modulePermissions),
        db.select().from(schema.masterPermissions),
      ]);

      const permById = new Map(permissions.map((p) => [p.id, { ...toPermissionDto(p), isSystem: isSystemPermission(p) }]));
      const permsByModule = new Map<number, ReturnType<typeof toPermissionDto>[]>();
      for (const link of links) {
        const perm = permById.get(link.permissionId);
        if (!perm) continue;
        if (!permsByModule.has(link.moduleId)) permsByModule.set(link.moduleId, []);
        permsByModule.get(link.moduleId)!.push(perm);
      }

      type ModuleNode = ReturnType<typeof toModuleDto> & {
        permissions: ReturnType<typeof toPermissionDto>[];
        children: ModuleNode[];
      };
      const byId = new Map<number, ModuleNode>();
      for (const m of modules) {
        byId.set(m.id, { ...toModuleDto(m, systemModuleCodes), permissions: permsByModule.get(m.id) ?? [], children: [] });
      }
      const roots: ModuleNode[] = [];
      for (const node of byId.values()) {
        if (node.parentModuleId != null && byId.has(node.parentModuleId)) {
          byId.get(node.parentModuleId)!.children.push(node);
        } else {
          roots.push(node);
        }
      }

      res.json({ data: roots });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/modules/:id/permissions', async (req, res) => {
    try {
      const moduleId = Number(req.params.id);
      const { code, name, description, sortOrder, permissionId } = req.body as {
        code?: string; name?: string; description?: string; sortOrder?: number; permissionId?: number;
      };

      const moduleRows = await db.select().from(schema.masterModules).where(eq(schema.masterModules.id, moduleId));
      if (!moduleRows[0]) {
        return void res.status(404).json({ error: 'Module not found' });
      }

      let permRow: typeof schema.masterPermissions.$inferSelect | undefined;

      if (permissionId !== undefined) {
        const rows = await db.select().from(schema.masterPermissions).where(eq(schema.masterPermissions.id, permissionId));
        permRow = rows[0];
        if (!permRow) {
          return void res.status(404).json({ error: 'Permission not found' });
        }
      } else {
        if (!code || !name) {
          return void res.status(400).json({ error: 'code and name are required to create a new permission' });
        }
        const existing = await db
          .select()
          .from(schema.masterPermissions)
          .where(sql`lower(${schema.masterPermissions.code}) = ${code.toLowerCase()}`);
        if (existing[0]) {
          return void res.status(409).json({ error: 'Permission code already exists.' });
        }
        const rows = await db
          .insert(schema.masterPermissions)
          .values({ code, name, description: description || null, sortOrder: sortOrder || 0, isSystem: false })
          .returning();
        permRow = rows[0];
      }

      if (!permRow) {
        return void res.status(500).json({ error: 'Failed to resolve permission' });
      }

      await db
        .insert(schema.modulePermissions)
        .values({ moduleId, permissionId: permRow.id })
        .onConflictDoNothing({ target: [schema.modulePermissions.moduleId, schema.modulePermissions.permissionId] });

      await cache.load();
      auditRbac(auditStore, req, 'PERMISSION_CREATED', 'rbac.permission', String(permRow.id), {
        code: permRow.code,
        name: permRow.name,
        moduleId,
        module: moduleRows[0].code,
      });
      res.status(201).json({ data: { ...toPermissionDto(permRow), isSystem: isSystemPermission(permRow) } });
    } catch (err) {
      if (pgCode(err) === '23505') {
        return void res.status(409).json({ error: 'Permission code already exists.' });
      }
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/modules/:id/permissions/:permissionId', async (req, res) => {
    try {
      const moduleId = Number(req.params.id);
      const permissionId = Number(req.params.permissionId);
      await db
        .delete(schema.modulePermissions)
        .where(and(eq(schema.modulePermissions.moduleId, moduleId), eq(schema.modulePermissions.permissionId, permissionId)));
      await cache.load();
      auditRbac(auditStore, req, 'PERMISSION_UNLINKED', 'rbac.module_permission', String(permissionId), { moduleId, permissionId });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Role Assignments ---
  router.get('/roles/:id/permissions', async (req, res) => {
    try {
      const { id } = req.params;
      const rows = await db
        .select({ permissionId: schema.rolePermissions.permissionId, moduleId: schema.rolePermissions.moduleId })
        .from(schema.rolePermissions)
        .where(eq(schema.rolePermissions.roleId, Number(id)));
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/roles/:id/permissions', async (req, res) => {
    try {
      const { id } = req.params;
      const { assignments } = req.body as { assignments?: { permissionId: number; moduleId?: number }[] };

      const previous = await db
        .select({ permissionId: schema.rolePermissions.permissionId })
        .from(schema.rolePermissions)
        .where(eq(schema.rolePermissions.roleId, Number(id)));
      const oldIds = previous.map((r) => r.permissionId).sort((a, b) => a - b);
      const newIds = (assignments ?? []).map((a) => a.permissionId).sort((a, b) => a - b);

      await db.transaction(async (tx) => {
        await tx.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, Number(id)));
        if (Array.isArray(assignments) && assignments.length > 0) {
          await tx.insert(schema.rolePermissions).values(
            assignments.map((item) => ({
              roleId: Number(id),
              permissionId: item.permissionId,
              moduleId: item.moduleId || null,
            })),
          );
        }
      });

      await cache.load();
      const added = newIds.filter((pid) => !oldIds.includes(pid));
      const removed = oldIds.filter((pid) => !newIds.includes(pid));
      if (added.length > 0) {
        auditRbac(auditStore, req, 'PERMISSION_ASSIGNED', 'rbac.role_permission', id, {
          roleId: Number(id),
          permissionIds: added,
        });
      }
      if (removed.length > 0) {
        auditRbac(auditStore, req, 'PERMISSION_REMOVED', 'rbac.role_permission', id, {
          roleId: Number(id),
          permissionIds: removed,
        });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
