import type { ITenantResolver, TenantResolutionInput, TenantContext, ITenantRepository } from '../index';

export class HeaderTenantResolver implements ITenantResolver {
  constructor(private readonly repository: ITenantRepository) {}

  async resolve(input: TenantResolutionInput): Promise<TenantContext | null> {
    if (!input.tenantHeader) return null;

    const tenant = await this.repository.findById(input.tenantHeader);
    if (!tenant) return null;

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      tenantStatus: tenant.status,
    };
  }
}
