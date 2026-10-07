/**
 * Strict role ladder. Every role has a numeric `level`; a HIGHER number outranks a lower one.
 *
 *   super_admin (100) > owner (90) > admin (80) > manager (60) > clerk (40) > viewer (20)
 *
 * Rules:
 *  - An actor may see / manage a role only if its level is STRICTLY LOWER than the actor's.
 *  - Roles on the same level cannot see or manage each other.
 *  - Nobody can see a role above them.
 *  - An unknown role (not in the master data) has no rank: it can see nothing, and anyone
 *    with a known role outranks it only if that role's level is above LEVEL_UNKNOWN_TARGET.
 */
import type { RbacRole } from './module-types';

/** Level assumed for a *target* whose role code isn't in the master data (treated as lowest). */
export const LEVEL_UNKNOWN_TARGET = 0;

type RoleLike = Pick<RbacRole, 'code' | 'level'>;

/** Level of `code`, or `undefined` when the role is unknown. Case-insensitive on the code. */
export function getRoleLevel(roles: readonly RoleLike[], code: string | undefined): number | undefined {
  if (code === undefined) return undefined;
  const lower = code.toLowerCase();
  return roles.find((r) => r.code.toLowerCase() === lower)?.level;
}

/** True when an actor at `actorLevel` strictly outranks `targetLevel`. Undefined actor never outranks. */
export function outranks(actorLevel: number | undefined, targetLevel: number | undefined): boolean {
  if (actorLevel === undefined) return false;
  return actorLevel > (targetLevel ?? LEVEL_UNKNOWN_TARGET);
}

/** Can an actor with `actorRoleCode` see / manage a role (or a user holding it) `targetRoleCode`? */
export function canManageRole(
  roles: readonly RoleLike[],
  actorRoleCode: string | undefined,
  targetRoleCode: string | undefined,
): boolean {
  return outranks(getRoleLevel(roles, actorRoleCode), getRoleLevel(roles, targetRoleCode));
}

/** Roles strictly below the actor's. Empty for an unknown actor role. */
export function filterVisibleRoles<T extends RoleLike>(roles: readonly T[], actorRoleCode: string | undefined): T[] {
  const actorLevel = getRoleLevel(roles, actorRoleCode);
  return roles.filter((r) => outranks(actorLevel, r.level));
}
