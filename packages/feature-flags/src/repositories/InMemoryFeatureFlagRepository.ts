import {
  FeatureDefinition,
  FeatureDependency,
  FeatureOverride,
  FeatureRollout,
  FeatureSchedule,
  FeatureTargetingRule,
} from '../domain/types.js';
import { FeatureFlagRepository } from './FeatureFlagRepository.js';

/**
 * A repository that keeps everything in memory: for tests, local development, and apps with a fixed set of
 * flags. Reads return copies, so callers cannot mutate stored state.
 */
export class InMemoryFeatureFlagRepository implements FeatureFlagRepository {
  private definitions = new Map<string, FeatureDefinition>();
  private overrides = new Map<string, FeatureOverride[]>();
  private rules = new Map<string, FeatureTargetingRule[]>();
  private rollouts = new Map<string, FeatureRollout>();
  private schedules = new Map<string, FeatureSchedule>();
  private dependencies = new Map<string, FeatureDependency[]>();

  setDefinition(definition: FeatureDefinition): this {
    this.definitions.set(definition.key, definition);
    return this;
  }

  setOverrides(flagKey: string, overrides: FeatureOverride[]): this {
    this.overrides.set(flagKey, overrides);
    return this;
  }

  /** Remove the overrides for one flag, or for every flag when no key is given. */
  clearOverrides(flagKey?: string): this {
    if (flagKey === undefined) this.overrides.clear();
    else this.overrides.delete(flagKey);
    return this;
  }

  setTargetingRules(flagKey: string, rules: FeatureTargetingRule[]): this {
    this.rules.set(flagKey, rules);
    return this;
  }

  setRollout(rollout: FeatureRollout): this {
    this.rollouts.set(rollout.flagKey, rollout);
    return this;
  }

  setSchedule(schedule: FeatureSchedule): this {
    this.schedules.set(schedule.flagKey, schedule);
    return this;
  }

  setDependencies(flagKey: string, dependencies: FeatureDependency[]): this {
    this.dependencies.set(flagKey, dependencies);
    return this;
  }

  async getDefinition(flagKey: string): Promise<FeatureDefinition | undefined> {
    return this.definitions.get(flagKey);
  }

  async getOverrides(flagKey: string): Promise<FeatureOverride[]> {
    return [...(this.overrides.get(flagKey) ?? [])];
  }

  async getTargetingRules(flagKey: string): Promise<FeatureTargetingRule[]> {
    return [...(this.rules.get(flagKey) ?? [])];
  }

  async getRollout(flagKey: string): Promise<FeatureRollout | undefined> {
    return this.rollouts.get(flagKey);
  }

  async getSchedule(flagKey: string): Promise<FeatureSchedule | undefined> {
    return this.schedules.get(flagKey);
  }

  async getDependencies(flagKey: string): Promise<FeatureDependency[]> {
    return [...(this.dependencies.get(flagKey) ?? [])];
  }
}
