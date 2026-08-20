import type {
  OfflineModuleRegistration,
  OfflineEntityRegistration,
} from '@maw/sdk/offline/types';

/**
 * Tracks which modules and entities have opted into offline support.
 * Only entities explicitly registered here get offline treatment.
 */
export class OfflineModuleRegistry {
  private readonly registrations = new Map<string, OfflineModuleRegistration>();

  register(reg: OfflineModuleRegistration): void {
    this.registrations.set(reg.moduleKey, reg);
  }

  unregister(moduleKey: string): void {
    this.registrations.delete(moduleKey);
  }

  isModuleRegistered(moduleKey: string): boolean {
    return this.registrations.has(moduleKey);
  }

  isEntityOfflineEnabled(moduleKey: string, entityType: string): boolean {
    const reg = this.registrations.get(moduleKey);
    if (!reg) return false;
    return reg.entities.some((e) => e.entityType === entityType);
  }

  getEntityConfig(entityType: string): OfflineEntityRegistration | undefined {
    for (const reg of this.registrations.values()) {
      const entity = reg.entities.find((e) => e.entityType === entityType);
      if (entity) return entity;
    }
    return undefined;
  }

  getAll(): readonly OfflineModuleRegistration[] {
    return Array.from(this.registrations.values());
  }

  getAllEntities(): readonly OfflineEntityRegistration[] {
    const entities: OfflineEntityRegistration[] = [];
    for (const reg of this.registrations.values()) {
      entities.push(...reg.entities);
    }
    return entities;
  }
}
