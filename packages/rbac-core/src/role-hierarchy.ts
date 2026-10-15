/**
 * Strict role ladder. Every role has a numeric `level`; a HIGHER number outranks a lower one.
 *
 *   super_admin (100) > owner (90) > admin (80) > manager (60) > clerk (40) > viewer (20)
 *
 * Rules:
 *  - An actor may see / manage a role only if its level is STRICTLY LOWER than the actor's.
 *  - Roles on the same level cannot see or manage each other — **except** the apex rank
 *    (highest level in the master list, typically `super_admin`): peers at that top level
 *    may manage each other so a superadmin can change another superadmin's permissions.
 *  - Nobody below the apex can see or manage an apex role.
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

/** Highest level present in the master role list (0 when empty). */
export function maxRoleLevel(roles: readonly RoleLike[]): number {
  if (roles.length === 0) return LEVEL_UNKNOWN_TARGET;
  return roles.reduce((max, r) => (r.level > max ? r.level : max), LEVEL_UNKNOWN_TARGET);
}

/** True when an actor at `actorLevel` strictly outranks `targetLevel`. Undefined actor never outranks. */
export function outranks(actorLevel: number | undefined, targetLevel: number | undefined): boolean {
  if (actorLevel === undefined) return false;
  return actorLevel > (targetLevel ?? LEVEL_UNKNOWN_TARGET);
}

/**
 * True when an actor at `actorLevel` may see / manage a target at `targetLevel`.
 * Same as `outranks`, plus apex peers (both at the maximum role level).
 */
export function canManageLevel(
  roles: readonly RoleLike[],
  actorLevel: number | undefined,
  targetLevel: number | undefined,
): boolean {
  if (outranks(actorLevel, targetLevel)) return true;
  if (actorLevel === undefined || targetLevel === undefined) return false;
  if (actorLevel !== targetLevel) return false;
  return actorLevel === maxRoleLevel(roles);
}

/** Can an actor with `actorRoleCode` see / manage a role (or a user holding it) `targetRoleCode`? */
export function canManageRole(
  roles: readonly RoleLike[],
  actorRoleCode: string | undefined,
  targetRoleCode: string | undefined,
): boolean {
  return canManageLevel(
    roles,
    getRoleLevel(roles, actorRoleCode),
    getRoleLevel(roles, targetRoleCode),
  );
}

/** Roles the actor may see / manage (strictly below them, plus apex peers when actor is at the top). */
export function filterVisibleRoles<T extends RoleLike>(roles: readonly T[], actorRoleCode: string | undefined): T[] {
  const actorLevel = getRoleLevel(roles, actorRoleCode);
  return roles.filter((r) => canManageLevel(roles, actorLevel, r.level));
}
