/**
 * @maw/tenancy — Multi-tenant foundation.
 *
 * Provides tenant identity, status, context, and resolution abstractions
 * that are completely database- and framework-agnostic.
 *
 * Infrastructure packages (e.g. @maw/postgres) implement the repository
 * and context-setting contracts defined here.
 */

// ---------------------------------------------------------------------------
// Tenant identity
// ---------------------------------------------------------------------------

export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';

export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: TenantStatus;
  readonly domain?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Tenant context
// ---------------------------------------------------------------------------

/**
 * The current tenant context — carried through requests, services, and
 * repository calls to scope all data access by tenant.
 */
export interface TenantContext {
  readonly tenantId: string;
  readonly tenantName?: string;
  readonly tenantSlug?: string;
  readonly tenantStatus?: TenantStatus;
}

// ---------------------------------------------------------------------------
// Tenant resolution
// ---------------------------------------------------------------------------

/**
 * Determines the current tenant from an incoming request's metadata.
 * Implementations may read a subdomain, a header, a JWT claim, a path
 * segment, or a database lookup — this contract hides all of that.
 */
export interface ITenantResolver {
  resolve(context: TenantResolutionInput): Promise<TenantContext | null>;
}

export interface TenantResolutionInput {
  /** e.g. "acme.example.com" */
  hostname?: string;
  /** e.g. custom X-Tenant-ID header */
  tenantHeader?: string;
  /** e.g. /api/tenants/:tenantId/... */
  pathSegment?: string;
  /** JWT claims may contain tenantId */
  jwtClaims?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tenant repository contract
// ---------------------------------------------------------------------------

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  findByDomain(domain: string): Promise<Tenant | null>;
  findAll(): Promise<Tenant[]>;
  create(input: CreateTenantInput): Promise<Tenant>;
  update(id: string, input: UpdateTenantInput): Promise<Tenant>;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  domain?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  status?: TenantStatus;
  domain?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tenant isolation contract
// ---------------------------------------------------------------------------

/**
 * Marks a repository as tenant-scoped. All query methods must
 * filter by tenantId to enforce data isolation.
 */
export interface ITenantScoped {
  readonly tenantId: string;
}

// ---------------------------------------------------------------------------
// Tenant context holder (async-safe)
// ---------------------------------------------------------------------------

/**
 * In-memory tenant context storage. Server frameworks should set this
 * per-request (e.g. via AsyncLocalStorage) and clear it when done.
 */
export interface ITenantContextHolder {
  get(): TenantContext | null;
  set(context: TenantContext): void;
  clear(): void;
  run<T>(context: TenantContext, fn: () => T): T;
}

/**
 * Simple synchronous tenant context holder — suitable for single-tenant
 * apps or testing. For multi-request servers, use an AsyncLocalStorage-based
 * implementation from the adapter layer.
 */
export function createTenantContextHolder(): ITenantContextHolder {
  let current: TenantContext | null = null;

  return {
    get() {
      return current;
    },
    set(context) {
      current = context;
    },
    clear() {
      current = null;
    },
    run<T>(context: TenantContext, fn: () => T): T {
      const prev = current;
      current = context;
      try {
        return fn();
      } finally {
        current = prev;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function isTenantActive(tenant: Tenant): boolean {
  return tenant.status === 'active';
}

export function requireActiveTenant(tenant: Tenant): void {
  if (!isTenantActive(tenant)) {
    throw new Error(`Tenant "${tenant.name}" is not active (status: ${tenant.status})`);
  }
}
