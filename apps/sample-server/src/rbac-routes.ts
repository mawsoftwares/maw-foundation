import { Router, type RequestHandler } from 'express';
import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, and } from 'drizzle-orm';
import type { MasterCache } from '@mawsoftwares/rbac-core';

function toRoleDto(r: typeof schema.masterRoles.$inferSelect) {
  return { id: r.id, code: r.code, name: r.name, description: r.description, isActive: r.isActive, sortOrder: r.sortOrder };
}
function toPermissionDto(r: typeof schema.masterPermissions.$inferSelect) {
  return { id: r.id, code: r.code, name: r.name, description: r.description, isActive: r.isActive, sortOrder: r.sortOrder };
}
function toModuleDto(r: typeof schema.masterModules.$inferSelect) {
  return { id: r.id, code: r.code, name: r.name, description: r.description, parentModuleId: r.parentModuleId, isActive: r.isActive, sortOrder: r.sortOrder };
}

export function createRbacRouter(
  db: DrizzleDb,
  cache: MasterCache,
  requirePermission: (perm: string) => RequestHandler,
): Router {
  const router = Router();
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
      res.status(201).json({ data: toRoleDto(rows[0]!) });
    } catch (err) {
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
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Permissions CRUD ---
  router.get('/permissions', async (_req, res) => {
    try {
      const rows = await db.select().from(schema.masterPermissions).orderBy(schema.masterPermissions.sortOrder);
      res.json({ data: rows.map(toPermissionDto) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/permissions', async (req, res) => {
    try {
      const { code, name, description, sortOrder } = req.body;
      const rows = await db
        .insert(schema.masterPermissions)
        .values({ code, name, description: description || null, sortOrder: sortOrder || 0 })
        .returning();
      await cache.load();
      res.status(201).json({ data: toPermissionDto(rows[0]!) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/permissions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, sortOrder, isActive } = req.body;
      const rows = await db
        .update(schema.masterPermissions)
        .set({ name, description: description || null, sortOrder: sortOrder || 0, isActive: isActive !== false, updatedAt: new Date() })
        .where(eq(schema.masterPermissions.id, Number(id)))
        .returning();
      await cache.load();
      res.json({ data: toPermissionDto(rows[0]!) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/permissions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(schema.masterPermissions).where(eq(schema.masterPermissions.id, Number(id)));
      await cache.load();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Modules CRUD ---
  router.get('/modules', async (_req, res) => {
    try {
      const rows = await db.select().from(schema.masterModules).orderBy(schema.masterModules.sortOrder);
      res.json({ data: rows.map(toModuleDto) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/modules', async (req, res) => {
    try {
      const { code, name, description, sortOrder, parentModuleId } = req.body;
      const rows = await db
        .insert(schema.masterModules)
        .values({ code, name, description: description || null, sortOrder: sortOrder || 0, parentModuleId: parentModuleId || null })
        .returning();
      await cache.load();
      res.status(201).json({ data: toModuleDto(rows[0]!) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/modules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, sortOrder, isActive, parentModuleId } = req.body;
      const rows = await db
        .update(schema.masterModules)
        .set({ name, description: description || null, sortOrder: sortOrder || 0, isActive: isActive !== false, parentModuleId: parentModuleId || null, updatedAt: new Date() })
        .where(eq(schema.masterModules.id, Number(id)))
        .returning();
      await cache.load();
      res.json({ data: toModuleDto(rows[0]!) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/modules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(schema.masterModules).where(eq(schema.masterModules.id, Number(id)));
      await cache.load();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Module tree with attached permissions (one screen for "create a module,
  // nest a child under it, and manage its permissions" instead of hopping between
  // separate Modules and Permissions tabs) ---
  router.get('/modules/tree', async (_req, res) => {
    try {
      const [modules, links, permissions] = await Promise.all([
        db.select().from(schema.masterModules).orderBy(schema.masterModules.sortOrder),
        db.select().from(schema.modulePermissions),
        db.select().from(schema.masterPermissions),
      ]);

      const permById = new Map(permissions.map((p) => [p.id, toPermissionDto(p)]));
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
        byId.set(m.id, { ...toModuleDto(m), permissions: permsByModule.get(m.id) ?? [], children: [] });
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

  // Create a permission and attach it to a module (or one of its children) in one step -
  // this is the "add permission from the same place" flow. If `permissionId` is given
  // instead of `code`/`name`, links an existing permission to this module instead.
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
        const rows = await db
          .insert(schema.masterPermissions)
          .values({ code, name, description: description || null, sortOrder: sortOrder || 0 })
          .onConflictDoUpdate({
            target: schema.masterPermissions.code,
            set: { name, description: description || null },
          })
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
      res.status(201).json({ data: toPermissionDto(permRow) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Unlink a permission from a module. The permission itself (master_permissions row) is
  // left intact - it may still be linked to other modules or assigned directly to roles.
  router.delete('/modules/:id/permissions/:permissionId', async (req, res) => {
    try {
      const moduleId = Number(req.params.id);
      const permissionId = Number(req.params.permissionId);
      await db
        .delete(schema.modulePermissions)
        .where(and(eq(schema.modulePermissions.moduleId, moduleId), eq(schema.modulePermissions.permissionId, permissionId)));
      await cache.load();
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
      const { assignments } = req.body;

      await db.transaction(async (tx) => {
        await tx.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, Number(id)));
        if (Array.isArray(assignments) && assignments.length > 0) {
          await tx.insert(schema.rolePermissions).values(
            assignments.map((item: { permissionId: number; moduleId?: number }) => ({
              roleId: Number(id),
              permissionId: item.permissionId,
              moduleId: item.moduleId || null,
            })),
          );
        }
      });

      await cache.load();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
