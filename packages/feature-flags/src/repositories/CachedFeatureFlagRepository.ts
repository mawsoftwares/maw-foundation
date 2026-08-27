import { FeatureFlagRepository } from './FeatureFlagRepository.js';
import { FeatureFlagCache } from '../cache/FeatureFlagCache.js';
import { FeatureDefinition, FeatureOverride, FeatureTargetingRule, FeatureRollout, FeatureSchedule, FeatureDependency } from '../domain/types.js';

export class CachedFeatureFlagRepository implements FeatureFlagRepository {
  constructor(
    private readonly dbRepo: FeatureFlagRepository,
    private readonly cache: FeatureFlagCache
  ) {}

  async getDefinition(flagKey: string): Promise<FeatureDefinition | undefined> {
    let def = await this.cache.getDefinition(flagKey);
    if (def === undefined) {
      def = await this.dbRepo.getDefinition(flagKey);
      if (def !== undefined) {
        await this.cache.setDefinition(flagKey, def);
      }
    }
    return def;
  }

  async getOverrides(flagKey: string): Promise<FeatureOverride[]> {
    let overrides = await this.cache.getOverrides(flagKey);
    if (overrides === undefined) {
      overrides = await this.dbRepo.getOverrides(flagKey);
      await this.cache.setOverrides(flagKey, overrides);
    }
    return overrides;
  }

  async getTargetingRules(flagKey: string): Promise<FeatureTargetingRule[]> {
    let rules = await this.cache.getTargetingRules(flagKey);
    if (rules === undefined) {
      rules = await this.dbRepo.getTargetingRules(flagKey);
      await this.cache.setTargetingRules(flagKey, rules);
    }
    return rules;
  }

  async getRollout(flagKey: string): Promise<FeatureRollout | undefined> {
    let rollout = await this.cache.getRollout(flagKey);
    if (rollout === undefined) {
      const dbRollout = await this.dbRepo.getRollout(flagKey);
      // store null if not found to avoid repeated cache misses
      await this.cache.setRollout(flagKey, dbRollout || null);
      return dbRollout;
    }
    return rollout === null ? undefined : rollout;
  }

  async getSchedule(flagKey: string): Promise<FeatureSchedule | undefined> {
    let schedule = await this.cache.getSchedule(flagKey);
    if (schedule === undefined) {
      const dbSchedule = await this.dbRepo.getSchedule(flagKey);
      await this.cache.setSchedule(flagKey, dbSchedule || null);
      return dbSchedule;
    }
    return schedule === null ? undefined : schedule;
  }

  async getDependencies(flagKey: string): Promise<FeatureDependency[]> {
    let deps = await this.cache.getDependencies(flagKey);
    if (deps === undefined) {
      deps = await this.dbRepo.getDependencies(flagKey);
      await this.cache.setDependencies(flagKey, deps);
    }
    return deps;
  }
}
