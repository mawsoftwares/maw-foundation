/**
 * Identity types shared across the platform.
 *
 * Generalized from Restaurant OS: `Role` is a free string here (products define their
 * own role set) rather than a fixed union, and every session is tenant-scoped.
 */

/** A role code. Free string so products append custom roles with no resolver change. */
export type Role = string;

/** A product/tenant audience — e.g. Sushmapet's 'admin' vs 'operator' apps. */
export type Audience = string;

export interface Session {
  readonly userId: string;
  readonly tenantId: string;
  readonly role: Role;
  /** Which app/audience this session was issued for (dual-audience gating). */
  readonly audience?: Audience;
  /** Licensed/enabled module keys for the tenant. */
  readonly entitlements: readonly string[];
  /** Per-user operational "work-as" capability grants. */
  readonly capabilities?: readonly string[];
  /**
   * The tenant's RBAC policy (role → permissions) delivered at login, so the client
   * resolves nav/actions exactly as the server enforces them. Absent → built-in defaults.
   */
  readonly rolePermissions?: Readonly<Record<string, readonly string[]>>;
  /** Optional scoping axis (e.g. Sushmapet plant id; null = all). */
  readonly scopeId?: string | null;
}

/** The single tenant every session belongs to until a product wires real multi-tenancy. */
export const DEFAULT_TENANT_ID = 'local';

/** The active tenant. */
export interface ITenantContext {
  current(): string | null;
}
