import type { Permission, AuthzContext, RolePolicy } from '@mawsoftwares/sdk/contracts/IAuthorization';

export type { Permission, AuthzContext, RolePolicy };

/** A tenant's editable policy: role → the permissions it is granted (the RBAC matrix). */
export type TenantRolePolicy = Readonly<Record<string, readonly Permission[]>>;

/**
 * The facts needed to resolve what a user can see and do, right now. Generalized from
 * Restaurant OS's `UserAccessContext`, with an ABAC `scope` (e.g. Sushmapet plant id)
 * that conditional grants read.
 */
export interface UserAccessContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly baseRole: string;
  /** Per-user operational "work-as" grants (raw strings; narrowed to known capabilities). */
  readonly grantedCapabilities: readonly string[];
  /** Modules enabled for the tenant (license ∪ feature-flags). */
  readonly enabledModules: readonly string[];
  /** Whether the subscription/licence is active (not expired past grace / suspended). */
  readonly subscriptionActive: boolean;
  /** The tenant's editable role→permissions policy. Absent → config default applies. */
  readonly rolePermissions?: TenantRolePolicy;
  /** ABAC facts bound into `can()` for this subject (e.g. `{ plantId }`). */
  readonly scope?: AuthzContext;
}

/** The resolved verdict: which capabilities are active + the action gate. */
export interface EffectiveAccess {
  /** Active capabilities = (base ∪ granted) ∩ enabled ∩ subscription. Drives nav. */
  readonly capabilities: readonly string[];
  /** Authorization ceiling for `resource.action` (superusers pass everything). */
  can(permission: Permission, context?: AuthzContext): boolean;
}

/**
 * The product-neutral RBAC vocabulary + policy. A product (or the sample) supplies one;
 * the resolver algorithm never changes. This is the generalization that lets one
 * resolver serve Restaurant, Sushmapet, and future apps.
 */
export interface RbacConfig {
  /** Coarse operational areas (modules a user occupies). */
  readonly capabilities: readonly string[];
  /** Which fine-grained `resource.action` permissions each capability implies. */
  readonly capabilityPermissions: Readonly<Record<string, readonly Permission[]>>;
  /** Roles that hold every permission and can never be locked out (e.g. `owner`). */
  readonly superuserRoles: readonly string[];
  /** Seed policy = built-in behavior for an un-edited tenant (backward compatible). */
  readonly defaultRolePolicy: TenantRolePolicy;
  /**
   * Whether a module is unlocked for the tenant. Defaults to `enabledModules.includes`.
   * Override to express Sushmapet feature-flags or Restaurant licence special-cases.
   */
  readonly isModuleEnabled?: (module: string, ctx: UserAccessContext) => boolean;
  /**
   * ABAC conditional grants (role → grants with a `when(context)` predicate). This is how
   * scoped rules like "operator may edit an entry only in their own plant" are expressed.
   */
  readonly conditionalGrants?: RolePolicy;
}
