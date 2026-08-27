/**
 * Authorization port (RBAC now, ABAC-ready). Constructed per session so it knows the
 * subject's role; `context` carries the facts a conditional policy needs (ownership,
 * elapsed time, amount, plant/scope) so "operator may edit an entry only in their own
 * plant" is expressible without a policy language.
 *
 * Contract only — implemented by `@mawsoftwares/rbac-core`.
 */
export type Permission = string; // 'resource.action', e.g. 'reports.view'

/** Runtime facts an ABAC condition may read (e.g. `{ plantId, ownerId, amount }`). */
export type AuthzContext = Readonly<Record<string, unknown>>;

export interface IAuthorization {
  /** Whether the current subject may perform `permission` under `context`. */
  can(permission: Permission, context?: AuthzContext): boolean;
}

/** A role's grant: a permission, optionally guarded by a condition over context. */
export interface PermissionGrant {
  readonly permission: Permission;
  /** Absent = unconditional; present = ABAC predicate over runtime context. */
  readonly when?: (context: AuthzContext) => boolean;
}

/** role → conditional grants. Extends the flat matrix with scoped/ABAC permissions. */
export type RolePolicy = Readonly<Record<string, readonly PermissionGrant[]>>;
