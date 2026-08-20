import type {
  IConflictResolver,
  ConflictDetail,
  ConflictStrategy,
  ResolvedConflict,
} from '@maw/sdk/contracts/IConflictResolver';

type EntityResolver<T = unknown> = (conflict: ConflictDetail<T>) => Promise<ResolvedConflict<T>>;

/**
 * Default conflict resolver with four built-in strategies:
 *  - server-wins: always takes server version
 *  - client-wins: always takes local version
 *  - last-write-wins: compares updatedAt timestamps
 *  - manual: throws so the UI layer can present a resolution dialog
 *
 * Per-entity custom resolvers take precedence when registered.
 */
export class DefaultConflictResolver implements IConflictResolver {
  private readonly entityResolvers = new Map<string, EntityResolver>();

  async resolve<T>(conflict: ConflictDetail<T>, strategy: ConflictStrategy): Promise<ResolvedConflict<T>> {
    const custom = this.entityResolvers.get(conflict.entityType) as EntityResolver<T> | undefined;
    if (custom) return custom(conflict);

    switch (strategy) {
      case 'server-wins':
        return { resolution: 'server-wins', mergedData: conflict.serverVersion };

      case 'client-wins':
        return { resolution: 'local-wins', mergedData: conflict.localVersion };

      case 'last-write-wins': {
        const localTime = new Date(conflict.localUpdatedAt).getTime();
        const serverTime = new Date(conflict.serverUpdatedAt).getTime();
        if (localTime >= serverTime) {
          return { resolution: 'local-wins', mergedData: conflict.localVersion };
        }
        return { resolution: 'server-wins', mergedData: conflict.serverVersion };
      }

      case 'manual':
        throw new Error(
          `Manual conflict resolution required for ${conflict.entityType}:${conflict.entityId}`,
        );
    }
  }

  registerEntityResolver<T>(
    entityType: string,
    resolver: (conflict: ConflictDetail<T>) => Promise<ResolvedConflict<T>>,
  ): () => void {
    this.entityResolvers.set(entityType, resolver as EntityResolver);
    return () => this.entityResolvers.delete(entityType);
  }
}
