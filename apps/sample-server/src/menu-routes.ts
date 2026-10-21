import { Router, type RequestHandler } from 'express';
import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, asc, sql } from 'drizzle-orm';
import {
  addModuleCode, removeModuleCode, listScaffolded, scaffoldRoot, scaffoldPermissionCodes, validateScaffoldInput,
} from './dev/module-scaffold';

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

/** Parenthesised, individually-bound list for `IN` (drizzle expands a bare JS array into a row, which `= ANY` rejects). */
const codeList = (codes: readonly string[]) => sql`(${sql.join(codes.map((c) => sql`${c}`), sql`, `)})`;

const MENU_PERMISSION_NOTE = 'Added from Menu Management';

type MenuDb = Pick<DrizzleDb, 'execute'>;

/**
 * A menu's `permission` only works if it exists in master_permissions and a role holds it, otherwise
 * nobody (super_admin included - access is purely data-driven) ever sees the item. Register it, grant
 * it to the admin roles (as db:seed does for registry permissions), and attach it to a module named after
 * the menu so RBAC Admin lists it there instead of under "Uncategorized". Idempotent; never renames or
 * re-links an existing module.
 */
async function ensureMenuPermission(
  db: MenuDb,
  menu: { key: string; label: string; permission: string | null | undefined },
): Promise<void> {
  const code = menu.permission;
  if (!code) return;
  const action = code.split('_')[0] || code;
  // is_system defaults to true in the table; a permission made here is user-managed, so it must stay deletable in RBAC Admin.
  await db.execute(sql`INSERT INTO master_permissions (code, name, description, is_system) VALUES (${code}, ${action}, ${MENU_PERMISSION_NOTE}, false) ON CONFLICT (code) DO NOTHING`);
  // Repair rows this helper created before the flag was set explicitly.
  await db.execute(sql`UPDATE master_permissions SET is_system = false WHERE code = ${code} AND description = ${MENU_PERMISSION_NOTE}`);
  await db.execute(sql`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM master_roles r JOIN master_permissions p ON p.code = ${code}
    WHERE r.code IN ('super_admin', 'owner', 'admin') ON CONFLICT DO NOTHING`);
  // Only attach when no module owns this permission yet (e.g. registry modules already link their own).
  await db.execute(sql`INSERT INTO master_modules (code, name) VALUES (${menu.key}, ${menu.label}) ON CONFLICT (code) DO NOTHING`);
  await db.execute(sql`
    INSERT INTO module_permissions (module_id, permission_id)
    SELECT m.id, p.id FROM master_modules m JOIN master_permissions p ON p.code = ${code}
    WHERE m.code = ${menu.key}
      AND NOT EXISTS (SELECT 1 FROM module_permissions mp WHERE mp.permission_id = p.id)
    ON CONFLICT (module_id, permission_id) DO NOTHING`);
}

type PgError = { code?: string; constraint?: string; detail?: string; message?: string };

// Drizzle wraps driver errors as "Failed query: ..." and hides the real Postgres
// error in `cause`; translate the common constraint violations into readable messages.
function menuWriteError(err: unknown): { status: number; error: string } {
  const e = err as Error & { cause?: PgError };
  const pg: PgError = e.cause ?? (err as PgError);
  if (pg.code === '23505') {
    return pg.constraint === 'menu_items_pkey'
      ? { status: 500, error: 'Menu id sequence is out of sync with menu_items; reset it with setval(\'menu_items_id_seq\', (SELECT MAX(id) FROM menu_items))' }
      : { status: 409, error: 'A menu item with this key already exists' };
  }
  if (pg.code === '23503') {
    return { status: 400, error: 'Parent menu item does not exist' };
  }
  return { status: 500, error: pg.message ?? e.message };
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
    /** Dev-only: allow generating/removing module source code from Menu Management. */
    scaffoldEnabled?: boolean;
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

  const scaffoldEnabled = deps.scaffoldEnabled === true;

  // Whether "add/delete with code" is available, and which menu keys have scaffolded code.
  router.get('/scaffold/status', deps.requireAuth, requireManage, (_req, res) => {
    res.json({ data: { enabled: scaffoldEnabled, scaffolded: scaffoldEnabled ? listScaffolded(scaffoldRoot()) : [] } });
  });

  // Generates the module code (docs/add-module-checklist.md) AND the menu row in one step.
  router.post('/scaffold', deps.requireAuth, requireManage, async (req, res) => {
    if (!scaffoldEnabled) {
      return void res.status(403).json({ error: 'Code generation is only available in development' });
    }
    const { key, label, path, icon, parentId, sortOrder } = req.body as Record<string, string | number | undefined>;
    const input = {
      key: String(key ?? ''),
      label: String(label ?? '').trim(),
      path: String(path ?? ''),
      icon: String(icon ?? ''),
      sortOrder: Number(sortOrder) || 0,
    };
    const invalid = validateScaffoldInput(input);
    if (invalid) return void res.status(400).json({ error: invalid });
    const existing = await db.select({ id: schema.menuItems.id }).from(schema.menuItems).where(eq(schema.menuItems.key, input.key));
    if (existing[0]) return void res.status(409).json({ error: 'A menu item with this key already exists' });

    let generated;
    try {
      generated = addModuleCode(scaffoldRoot(), input);
    } catch (err) {
      return void res.status(409).json({ error: (err as Error).message });
    }
    try {
      const readCode = generated.permissions[0]!.code;
      const rows = await db
        .insert(schema.menuItems)
        .values({
          key: input.key,
          label: input.label,
          path: input.path || `/${input.key}`,
          icon: input.icon || null,
          parentId: parentId ? Number(parentId) : null,
          permission: readCode,
          sortOrder: input.sortOrder,
        })
        .returning();
      // Register the permissions now and grant them to the admin roles, as db:seed would,
      // so the menu works after one server restart (the registry only loads at boot).
      for (const p of generated.permissions) {
        await db.execute(sql`INSERT INTO master_permissions (code, name, description, is_system) VALUES (${p.code}, ${p.name}, ${p.description}, false) ON CONFLICT (code) DO NOTHING`);
      }
      await db.execute(sql`INSERT INTO master_modules (code, name) VALUES (${input.key}, ${input.label}) ON CONFLICT (code) DO NOTHING`);
      await db.execute(sql`
        INSERT INTO module_permissions (module_id, permission_id)
        SELECT m.id, p.id FROM master_modules m JOIN master_permissions p ON p.code IN ${codeList(generated.permissions.map((p) => p.code))}
        WHERE m.code = ${input.key} ON CONFLICT (module_id, permission_id) DO NOTHING`);
      await db.execute(sql`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM master_roles r JOIN master_permissions p ON p.code IN ${codeList(generated.permissions.map((p) => p.code))}
        WHERE r.code IN ('super_admin', 'owner', 'admin') ON CONFLICT DO NOTHING`);
      res.status(201).json({ data: toMenuDto(rows[0]!), restartRequired: true });
    } catch (err) {
      removeModuleCode(scaffoldRoot(), input.key);
      const { status, error } = menuWriteError(err);
      res.status(status).json({ error });
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
      if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(String(key))) {
        return void res.status(400).json({ error: 'Key must be lowercase letters, digits and single hyphens (e.g. item-master)' });
      }
      const values = {
        key,
        label,
        path: path || null,
        icon: icon || null,
        parentId: parentId || null,
        permission: permission || null,
        featureFlag: featureFlag || null,
        sortOrder: sortOrder || 0,
      };
      const insert = () => db.insert(schema.menuItems).values(values).returning();
      let rows;
      try {
        rows = await insert();
      } catch (err) {
        // Self-heal an id sequence that fell behind MAX(id) (e.g. after a data
        // restore or explicit-id inserts), then retry once.
        const pg = (err as { cause?: PgError }).cause;
        if (pg?.code !== '23505' || pg.constraint !== 'menu_items_pkey') throw err;
        await db.execute(
          sql`SELECT setval(pg_get_serial_sequence('menu_items', 'id'), (SELECT COALESCE(MAX(id), 1) FROM menu_items))`,
        );
        rows = await insert();
      }
      await ensureMenuPermission(db, rows[0]!);
      res.status(201).json({ data: toMenuDto(rows[0]!) });
    } catch (err) {
      const { status, error } = menuWriteError(err);
      res.status(status).json({ error });
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
      await ensureMenuPermission(db, rows[0]);
      res.json({ data: toMenuDto(rows[0]) });
    } catch (err) {
      const { status, error } = menuWriteError(err);
      res.status(status).json({ error });
    }
  });

  // Deletes the item and (via ON DELETE CASCADE) its whole subtree. With ?withCode=true (dev only)
  // it also removes the module code the scaffolder generated for this item.
  router.delete('/:id', deps.requireAuth, requireManage, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const found = await db.select().from(schema.menuItems).where(eq(schema.menuItems.id, id));
      if (!found[0]) {
        return void res.status(404).json({ error: 'Menu item not found' });
      }
      const withCode = req.query.withCode === 'true';
      if (withCode && !scaffoldEnabled) {
        return void res.status(403).json({ error: 'Code removal is only available in development' });
      }
      await db.delete(schema.menuItems).where(eq(schema.menuItems.id, id));
      let codeRemoved = false;
      if (withCode) {
        const key = found[0].key;
        codeRemoved = removeModuleCode(scaffoldRoot(), key);
        if (codeRemoved) {
          await db.execute(sql`DELETE FROM master_permissions WHERE code IN ${codeList(scaffoldPermissionCodes(key))}`);
          await db.execute(sql`DELETE FROM master_modules WHERE code = ${key}`);
        }
      }
      res.json({ success: true, codeRemoved });
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

  return router;
}
