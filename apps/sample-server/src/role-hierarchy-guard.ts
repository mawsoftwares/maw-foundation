import type { Request, RequestHandler } from 'express';
import type { DynamicAuthedRequest } from '@mawsoftwares/server-express';
import { getRoleLevel, outranks, type RbacRole } from '@mawsoftwares/rbac-core';
import type { IUsersRepository } from './modules/users';

/** Role list used for rank lookups. Reads a fresh list per request so level edits apply immediately. */
export type RoleSource = () => Promise<readonly Pick<RbacRole, 'id' | 'code' | 'level'>[]>;

export function actorOf(req: Request): { userId: string; tenantId: string; role: string } | undefined {
  const claims = (req as DynamicAuthedRequest).maw?.claims;
  return claims ? { userId: claims.userId, tenantId: claims.tenantId, role: claims.role } : undefined;
}

export interface UserHierarchyGuards {
  /** For routes with `/:id`: hides and blocks users the actor does not outrank. */
  readonly guardTarget: RequestHandler;
  /** For create/update: the role being assigned must be strictly below the actor's. */
  readonly guardAssignedRole: RequestHandler;
  /** Role codes the actor may see or assign. */
  readonly visibleRoleCodes: (actorRole: string) => Promise<string[]>;
}

/**
 * Enforces the strict role ladder on the user-management API.
 *
 * - A target user is reachable only if their role is strictly below the actor's (404 otherwise, so a
 *   hidden user's existence isn't revealed). Users can always reach themselves.
 * - A role can be assigned only if it is strictly below the actor's (403 otherwise).
 */
export function createUserHierarchyGuards(roleSource: RoleSource, repo: IUsersRepository): UserHierarchyGuards {
  /** Role codes the actor may see/assign. */
  async function visibleRoleCodes(actorRole: string): Promise<string[]> {
    const roles = await roleSource();
    const actorLevel = getRoleLevel(roles, actorRole);
    return roles.filter((r) => outranks(actorLevel, r.level)).map((r) => r.code);
  }

  /** For routes with `/:id` — hide / block users the actor does not outrank. */
  const guardTarget: RequestHandler = async (req, res, next) => {
    try {
      const actor = actorOf(req);
      if (!actor) return void res.status(401).json({ error: 'Unauthenticated' });
      const id = String(req.params['id'] ?? '');
      if (id === actor.userId) return next();

      const target = await repo.findById(id, actor.tenantId);
      if (!target || target.deletedAt) return next(); // let the controller produce its usual 404
      const roles = await roleSource();
      if (!outranks(getRoleLevel(roles, actor.role), getRoleLevel(roles, target.role))) {
        return void res.status(404).json({ error: 'User not found' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };

  /** For create/update — the role being assigned must be strictly below the actor's. */
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
      const actorLevel = getRoleLevel(roles, actor.role);
      // Re-sending a user's current role is not an assignment (lets someone edit their own profile).
      const id = req.params['id'];
      const current = id !== undefined ? (await repo.findById(String(id), actor.tenantId))?.role : undefined;
      for (const code of requested) {
        if (code !== undefined && current !== undefined && code.toLowerCase() === current.toLowerCase()) continue;
        // An unknown / inactive role can't be assigned: it would carry no level now and could be
        // created later at a higher one.
        const level = getRoleLevel(roles, code);
        if (level === undefined || !outranks(actorLevel, level)) {
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
