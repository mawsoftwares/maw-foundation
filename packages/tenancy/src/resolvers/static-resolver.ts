import type { ITenantResolver, TenantContext, TenantResolutionInput } from '../index';

/**
 * Always resolves the one configured tenant, whatever the request says. This is the resolver for
 * single-tenant deployments: the tenant comes from server configuration, never from the caller, so a
 * body, query, header or hostname cannot select another tenant. Multi-tenant deployments swap it for
 * `SubdomainTenantResolver` (or a `CompositeTenantResolver`) without touching product code.
 */
export class StaticTenantResolver implements ITenantResolver {
  private readonly context: TenantContext;

  constructor(context: TenantContext) {
    if (context.tenantId.trim() === '') {
      throw new Error('StaticTenantResolver requires a non-empty tenantId');
    }
    this.context = { ...context };
  }

  resolve(_input: TenantResolutionInput): Promise<TenantContext | null> {
    return Promise.resolve({ ...this.context });
  }
}
