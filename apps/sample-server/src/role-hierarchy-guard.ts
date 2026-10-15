import type { Request, RequestHandler } from 'express';
import type { DynamicAuthedRequest } from '@mawsoftwares/server-express';
import { canManageRole, filterVisibleRoles, getRoleLevel, type RbacRole } from '@mawsoftwares/rbac-core';
import type { IUsersRepository } from './modules/users';

/** Role list used for rank lookups. Reads a fresh list per request so level edits apply immediately. */
export type RoleSource = () => Promise<readonly Pick<RbacRole, 'id' | 'code' | 'level'>[]>;

export function actorOf(req: Request): { userId: string; tenantId: string; role: string } | undefined {
  const claims = (req as DynamicAuthedRequest).maw?.claims;
  return claims ? { userId: claims.userId, tenantId: claims.tenantId, role: claims.role } : undefined;
}

export interface UserHierarchyGuards {
  /** For routes with `/:id`: hides and blocks users the actor cannot manage. */
  readonly guardTarget: RequestHandler;
  /** For create/update: the role being assigned must be manageable by the actor. */
  readonly guardAssignedRole: RequestHandler;
  /** Role codes the actor may see or assign. */
  readonly visibleRoleCodes: (actorRole: string) => Promise<string[]>;
}

/**
 * Enforces the role ladder on the user-management API.
 *
 * - A target user is reachable only if the actor can manage their role (404 otherwise, so a
 *   hidden user's existence isn't revealed). Users can always reach themselves.
 * - Apex peers (`super_admin` managing another `super_admin`) are allowed; mid-level peers are not.
 * - A role can be assigned only if the actor can manage it (403 otherwise).
 */
export function createUserHierarchyGuards(roleSource: RoleSource, repo: IUsersRepository): UserHierarchyGuards {
  /** Role codes the actor may see/assign. */
  async function visibleRoleCodes(actorRole: string): Promise<string[]> {
    return filterVisibleRoles(await roleSource(), actorRole).map((r) => r.code);
  }

  /** For routes with `/:id` — hide / block users the actor cannot manage. */
  const guardTarget: RequestHandler = async (req, res, next) => {
    try {
      const actor = actorOf(req);
      if (!actor) return void res.status(401).json({ error: 'Unauthenticated' });
      const id = String(req.params['id'] ?? '');
      if (id === actor.userId) return next();

      const target = await repo.findById(id, actor.tenantId);
      if (!target || target.deletedAt) return next(); // let the controller produce its usual 404
      const roles = await roleSource();
      if (!canManageRole(roles, actor.role, target.role)) {
        return void res.status(404).json({ error: 'User not found' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };

  /** For create/update — the role being assigned must be manageable by the actor. */
  const guardAssignedRole: RequestHandler = async (req, res, next) => {
    try {
      const actor = actorOf(req);
      if (!actor) return void res.status(401).json({ error: 'Unauthenticated' });
      const body = (req.body ?? {}) as { role?: unknown; roleId?: unknown };
      const roles = await roleSource();
      const requested: (string | undefined)[] = [];
      if (typeof body.role === 'string' && body.role.trim() !== '') requested.push(body.role.trim());
      if (body.roleId !== undefined && body.roleId !== null && body.roleId !== '') {
        requested.push(roles.find((r) => String(r.id) === String(body.roleId))?.code ?? '\u0000unknown');
      }
      // Re-sending a user's current role is not an assignment (lets someone edit their own profile).
      const id = req.params['id'];
      const current = id !== undefined ? (await repo.findById(String(id), actor.tenantId))?.role : undefined;
      for (const code of requested) {
        if (code !== undefined && current !== undefined && code.toLowerCase() === current.toLowerCase()) continue;
        // An unknown / inactive role can't be assigned: it would carry no level now and could be
        // created later at a higher one.
        const level = getRoleLevel(roles, code);
        if (level === undefined || !canManageRole(roles, actor.role, code)) {
          return void res.status(403).json({ error: 'You cannot assign a role at or above your own level.' });
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };

  return { guardTarget, guardAssignedRole, visibleRoleCodes };
}
