import { Router } from 'express';
import type { PgTransactionPool } from '@mawsoftwares/database';
import type { MasterCache } from '@mawsoftwares/rbac-core';
import { withTransaction } from '@mawsoftwares/database';

export function createRbacRouter(pool: PgTransactionPool, cache: MasterCache): Router {
  const router = Router();

  // --- Roles CRUD ---
  router.get('/roles', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, code, name, description, is_active AS "isActive", sort_order AS "sortOrder" FROM master_roles ORDER BY sort_order'
      );
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/roles', async (req, res) => {
    try {
      const { code, name, description, sortOrder } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO master_roles (code, name, description, sort_order) VALUES ($1, $2, $3, $4) RETURNING id, code, name, description, is_active AS "isActive", sort_order AS "sortOrder"',
        [code, name, description || null, sortOrder || 0]
      );
      await cache.load();
      res.status(201).json({ data: rows[0] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/roles/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, sortOrder, isActive } = req.body;
      const { rows } = await pool.query(
        'UPDATE master_roles SET name = $1, description = $2, sort_order = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING id, code, name, description, is_active AS "isActive", sort_order AS "sortOrder"',
        [name, description || null, sortOrder || 0, isActive !== false, id]
      );
      await cache.load();
      res.json({ data: rows[0] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/roles/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM master_roles WHERE id = $1', [id]);
      await cache.load();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Permissions CRUD ---
  router.get('/permissions', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, code, name, description, is_active AS "isActive", sort_order AS "sortOrder" FROM master_permissions ORDER BY sort_order'
      );
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/permissions', async (req, res) => {
    try {
      const { code, name, description, sortOrder } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO master_permissions (code, name, description, sort_order) VALUES ($1, $2, $3, $4) RETURNING id, code, name, description, is_active AS "isActive", sort_order AS "sortOrder"',
        [code, name, description || null, sortOrder || 0]
      );
      await cache.load();
      res.status(201).json({ data: rows[0] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/permissions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, sortOrder, isActive } = req.body;
      const { rows } = await pool.query(
        'UPDATE master_permissions SET name = $1, description = $2, sort_order = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING id, code, name, description, is_active AS "isActive", sort_order AS "sortOrder"',
        [name, description || null, sortOrder || 0, isActive !== false, id]
      );
      await cache.load();
      res.json({ data: rows[0] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/permissions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM master_permissions WHERE id = $1', [id]);
      await cache.load();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Modules CRUD ---
  router.get('/modules', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, code, name, description, parent_module_id AS "parentModuleId", is_active AS "isActive", sort_order AS "sortOrder" FROM master_modules ORDER BY sort_order'
      );
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/modules', async (req, res) => {
    try {
      const { code, name, description, sortOrder, parentModuleId } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO master_modules (code, name, description, sort_order, parent_module_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, code, name, description, parent_module_id AS "parentModuleId", is_active AS "isActive", sort_order AS "sortOrder"',
        [code, name, description || null, sortOrder || 0, parentModuleId || null]
      );
      await cache.load();
      res.status(201).json({ data: rows[0] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/modules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, sortOrder, isActive, parentModuleId } = req.body;
      const { rows } = await pool.query(
        'UPDATE master_modules SET name = $1, description = $2, sort_order = $3, is_active = $4, parent_module_id = $5, updated_at = NOW() WHERE id = $6 RETURNING id, code, name, description, parent_module_id AS "parentModuleId", is_active AS "isActive", sort_order AS "sortOrder"',
        [name, description || null, sortOrder || 0, isActive !== false, parentModuleId || null, id]
      );
      await cache.load();
      res.json({ data: rows[0] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/modules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM master_modules WHERE id = $1', [id]);
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
      const { rows } = await pool.query(
        'SELECT permission_id AS "permissionId", module_id AS "moduleId" FROM role_permissions WHERE role_id = $1',
        [id]
      );
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/roles/:id/permissions', async (req, res) => {
    try {
      const { id } = req.params;
      const { assignments } = req.body; // Array of { permissionId: number, moduleId?: number }
      
      await withTransaction(pool, async (client) => {
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
        if (Array.isArray(assignments) && assignments.length > 0) {
          for (const item of assignments) {
            await client.query(
              'INSERT INTO role_permissions (role_id, permission_id, module_id) VALUES ($1, $2, $3)',
              [id, item.permissionId, item.moduleId || null]
            );
          }
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
