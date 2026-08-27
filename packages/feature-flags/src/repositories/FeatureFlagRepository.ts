import {
  FeatureDefinition,
  FeatureOverride,
  FeatureTargetingRule,
  FeatureRollout,
  FeatureSchedule,
  FeatureDependency,
} from '../domain/types.js';

export interface FeatureFlagRepository {
  getDefinition(flagKey: string): Promise<FeatureDefinition | undefined>;
  getOverrides(flagKey: string): Promise<FeatureOverride[]>;
  getTargetingRules(flagKey: string): Promise<FeatureTargetingRule[]>;
  getRollout(flagKey: string): Promise<FeatureRollout | undefined>;
  getSchedule(flagKey: string): Promise<FeatureSchedule | undefined>;
  getDependencies(flagKey: string): Promise<FeatureDependency[]>;
}
