import type { ITenantResolver, TenantResolutionInput, TenantContext, ITenantRepository } from '../index';

export class SubdomainTenantResolver implements ITenantResolver {
  constructor(
    private readonly repository: ITenantRepository,
    private readonly baseDomain?: string,
  ) {}

  async resolve(input: TenantResolutionInput): Promise<TenantContext | null> {
    if (!input.hostname) return null;

    const slug = this.extractSubdomain(input.hostname);
    if (!slug) return null;

    const tenant = await this.repository.findBySlug(slug);
    if (!tenant) return null;

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      tenantStatus: tenant.status,
    };
  }

  private extractSubdomain(hostname: string): string | null {
    const host = hostname.split(':')[0]!;

    if (this.baseDomain) {
      if (!host.endsWith(`.${this.baseDomain}`)) return null;
      const sub = host.slice(0, -(this.baseDomain.length + 1));
      return sub || null;
    }

    const parts = host.split('.');
    if (parts.length < 3) return null;
    return parts[0]!;
  }
}
