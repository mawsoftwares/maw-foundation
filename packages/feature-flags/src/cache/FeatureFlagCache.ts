import { FeatureDefinition, FeatureOverride, FeatureTargetingRule, FeatureRollout, FeatureSchedule, FeatureDependency } from '../domain/types.js';

export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class InMemoryCacheProvider implements CacheProvider {
  private store = new Map<string, { value: any; expiresAt: number }>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number = 60000): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export class FeatureFlagCache {
  constructor(private provider: CacheProvider = new InMemoryCacheProvider(), private ttlMs: number = 60000) {}

  private key(type: string, flagKey: string): string {
    return `ff:${type}:${flagKey}`;
  }

  async getDefinition(flagKey: string): Promise<FeatureDefinition | undefined> {
    return this.provider.get<FeatureDefinition>(this.key('def', flagKey));
  }
  async setDefinition(flagKey: string, def: FeatureDefinition): Promise<void> {
    return this.provider.set(this.key('def', flagKey), def, this.ttlMs);
  }

  async getOverrides(flagKey: string): Promise<FeatureOverride[] | undefined> {
    return this.provider.get<FeatureOverride[]>(this.key('ovr', flagKey));
  }
  async setOverrides(flagKey: string, overrides: FeatureOverride[]): Promise<void> {
    return this.provider.set(this.key('ovr', flagKey), overrides, this.ttlMs);
  }

  async getTargetingRules(flagKey: string): Promise<FeatureTargetingRule[] | undefined> {
    return this.provider.get<FeatureTargetingRule[]>(this.key('tgt', flagKey));
  }
  async setTargetingRules(flagKey: string, rules: FeatureTargetingRule[]): Promise<void> {
    return this.provider.set(this.key('tgt', flagKey), rules, this.ttlMs);
  }

  async getRollout(flagKey: string): Promise<FeatureRollout | null | undefined> {
    return this.provider.get<FeatureRollout | null>(this.key('rll', flagKey));
  }
  async setRollout(flagKey: string, rollout: FeatureRollout | null): Promise<void> {
    return this.provider.set(this.key('rll', flagKey), rollout, this.ttlMs);
  }

  async getSchedule(flagKey: string): Promise<FeatureSchedule | null | undefined> {
    return this.provider.get<FeatureSchedule | null>(this.key('sch', flagKey));
  }
  async setSchedule(flagKey: string, schedule: FeatureSchedule | null): Promise<void> {
    return this.provider.set(this.key('sch', flagKey), schedule, this.ttlMs);
  }

  async getDependencies(flagKey: string): Promise<FeatureDependency[] | undefined> {
    return this.provider.get<FeatureDependency[]>(this.key('dep', flagKey));
  }
  async setDependencies(flagKey: string, deps: FeatureDependency[]): Promise<void> {
    return this.provider.set(this.key('dep', flagKey), deps, this.ttlMs);
  }

  async invalidate(flagKey: string): Promise<void> {
    await Promise.all([
      this.provider.del(this.key('def', flagKey)),
      this.provider.del(this.key('ovr', flagKey)),
      this.provider.del(this.key('tgt', flagKey)),
      this.provider.del(this.key('rll', flagKey)),
      this.provider.del(this.key('sch', flagKey)),
      this.provider.del(this.key('dep', flagKey)),
    ]);
  }
}
