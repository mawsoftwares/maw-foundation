import { Router } from 'express';
import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq } from 'drizzle-orm';
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

export function createRbacRouter(db: DrizzleDb, cache: MasterCache): Router {
  const router = Router();

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
