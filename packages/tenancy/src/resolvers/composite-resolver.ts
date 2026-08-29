import type { ITenantResolver, TenantResolutionInput, TenantContext } from '../index';

export class CompositeTenantResolver implements ITenantResolver {
  private readonly resolvers: readonly ITenantResolver[];

  constructor(resolvers: ITenantResolver[]) {
    this.resolvers = resolvers;
  }

  async resolve(input: TenantResolutionInput): Promise<TenantContext | null> {
    for (const resolver of this.resolvers) {
      const result = await resolver.resolve(input);
      if (result) return result;
    }
    return null;
  }
}
