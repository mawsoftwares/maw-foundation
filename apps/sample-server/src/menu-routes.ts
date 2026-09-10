import { Router, type RequestHandler } from 'express';
import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, asc } from 'drizzle-orm';

function toMenuDto(r: typeof schema.menuItems.$inferSelect) {
  return {
    id: r.id,
    key: r.key,
    label: r.label,
    path: r.path,
    icon: r.icon,
    parentId: r.parentId,
    permission: r.permission,
    featureFlag: r.featureFlag,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
  };
}

type MenuNode = ReturnType<typeof toMenuDto> & { children: MenuNode[] };

function buildTree(rows: ReturnType<typeof toMenuDto>[]): MenuNode[] {
  const byId = new Map<number, MenuNode>();
  const roots: MenuNode[] = [];

  for (const row of rows) {
    byId.set(row.id, { ...row, children: [] });
  }
  for (const node of byId.values()) {
    if (node.parentId != null && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: MenuNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/**
 * Menu Management: admin CRUD for the DB-backed `menu_items` table, plus a
 * `/tree` endpoint the frontend nav consumes. Read access (`/tree`) only
 * requires authentication — every logged-in user needs the nav to render;
 * the frontend still filters items by `permission`/`featureFlag` client-side
 * with the same can()/isEnabled() checks used elsewhere. Write access
 * (create/update/delete/reorder) requires `Manage_Menus`.
 */
export function createMenuRouter(
  db: DrizzleDb,
  deps: {
    requireAuth: RequestHandler;
    requirePermission: (perm: string) => RequestHandler;
  },
): Router {
  const router = Router();
  const requireManage = deps.requirePermission('Manage_Menus');

  // Full tree, active items only - what the frontend nav renders.
  router.get('/tree', deps.requireAuth, async (_req, res) => {
    try {
      const rows = await db
        .select()
        .from(schema.menuItems)
        .where(eq(schema.menuItems.isActive, true))
        .orderBy(asc(schema.menuItems.sortOrder));
      res.json({ data: buildTree(rows.map(toMenuDto)) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Flat list (including inactive), for the admin management screen.
  router.get('/', deps.requireAuth, requireManage, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.menuItems).orderBy(asc(schema.menuItems.sortOrder));
      res.json({ data: rows.map(toMenuDto) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:id', deps.requireAuth, requireManage, async (req, res) => {
    try {
      const rows = await db.select().from(schema.menuItems).where(eq(schema.menuItems.id, Number(req.params.id)));
      if (!rows[0]) {
        return void res.status(404).json({ error: 'Menu item not found' });
      }
      res.json({ data: toMenuDto(rows[0]) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/', deps.requireAuth, requireManage, async (req, res) => {
    try {
      const { key, label, path, icon, parentId, permission, featureFlag, sortOrder } = req.body;
      if (!key || !label) {
        return void res.status(400).json({ error: 'key and label are required' });
      }
      const rows = await db
        .insert(schema.menuItems)
        .values({
          key,
          label,
          path: path || null,
          icon: icon || null,
          parentId: parentId || null,
          permission: permission || null,
          featureFlag: featureFlag || null,
          sortOrder: sortOrder || 0,
        })
        .returning();
      res.status(201).json({ data: toMenuDto(rows[0]!) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.put('/:id', deps.requireAuth, requireManage, async (req, res) => {
    try {
      const { id } = req.params;
      const { label, path, icon, parentId, permission, featureFlag, sortOrder, isActive } = req.body;
      if (parentId != null && Number(parentId) === Number(id)) {
        return void res.status(400).json({ error: 'A menu item cannot be its own parent' });
      }
      const rows = await db
        .update(schema.menuItems)
        .set({
          label,
          path: path || null,
          icon: icon || null,
          parentId: parentId || null,
          permission: permission || null,
          featureFlag: featureFlag || null,
          sortOrder: sortOrder || 0,
          isActive: isActive !== false,
          updatedAt: new Date(),
        })
        .where(eq(schema.menuItems.id, Number(id)))
        .returning();
      if (!rows[0]) {
        return void res.status(404).json({ error: 'Menu item not found' });
      }
      res.json({ data: toMenuDto(rows[0]) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Bulk reorder: [{ id, sortOrder, parentId }] - used by the admin drag-and-drop tree.
  router.post('/reorder', deps.requireAuth, requireManage, async (req, res) => {
    try {
      const { items } = req.body as { items?: { id: number; sortOrder: number; parentId?: number | null }[] };
      if (!Array.isArray(items)) {
        return void res.status(400).json({ error: 'items must be an array' });
      }
      await db.transaction(async (tx) => {
        for (const item of items) {
          await tx
            .update(schema.menuItems)
            .set({ sortOrder: item.sortOrder, parentId: item.parentId ?? null, updatedAt: new Date() })
            .where(eq(schema.menuItems.id, item.id));
        }
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/:id', deps.requireAuth, requireManage, async (req, res) => {
    try {
      await db.delete(schema.menuItems).where(eq(schema.menuItems.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
