import type { ITenantResolver, TenantResolutionInput, TenantContext, ITenantRepository } from '../index';

export class JwtTenantResolver implements ITenantResolver {
  constructor(private readonly repository: ITenantRepository) {}

  async resolve(input: TenantResolutionInput): Promise<TenantContext | null> {
    const tenantId = input.jwtClaims?.['tenantId'] as string | undefined;
    if (!tenantId) return null;

    const tenant = await this.repository.findById(tenantId);
    if (!tenant) return null;

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      tenantStatus: tenant.status,
    };
  }
}
