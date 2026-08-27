import { FeatureFlagRepository } from './FeatureFlagRepository.js';
import {
  FeatureDefinition,
  FeatureOverride,
  FeatureTargetingRule,
  FeatureRollout,
  FeatureSchedule,
  FeatureDependency,
} from '../domain/types.js';

// Assuming we use Knex or something similar from @mawsoftwares/database
export class PostgresFeatureFlagRepository implements FeatureFlagRepository {
  constructor(private db: any) {} // Inject Knex instance or MAW Database wrapper

  async getDefinition(flagKey: string): Promise<FeatureDefinition | undefined> {
    const row = await this.db('feature_flags').where({ key: flagKey }).first();
    if (!row) return undefined;
    return {
      key: row.key,
      name: row.name,
      description: row.description,
      defaultValue: row.default_value,
      isActive: row.is_active,
      failClosed: row.fail_closed,
      riskLevel: row.risk_level,
      metadata: row.metadata,
    };
  }

  async getOverrides(flagKey: string): Promise<FeatureOverride[]> {
    const rows = await this.db('feature_flag_overrides')
      .join('feature_flags', 'feature_flags.id', 'feature_flag_overrides.feature_flag_id')
      .where('feature_flags.key', flagKey)
      .select('feature_flag_overrides.*');

    return rows.map((row: any) => ({
      flagKey,
      scope: row.scope_type,
      scopeId: row.scope_id,
      state: row.state,
    }));
  }

  async getTargetingRules(flagKey: string): Promise<FeatureTargetingRule[]> {
    const rows = await this.db('feature_flag_rules')
      .join('feature_flags', 'feature_flags.id', 'feature_flag_rules.feature_flag_id')
      .where('feature_flags.key', flagKey)
      .select('feature_flag_rules.*');

    return rows.map((row: any) => ({
      flagKey,
      attribute: row.attribute,
      operator: row.operator,
      value: row.value,
    }));
  }

  async getRollout(flagKey: string): Promise<FeatureRollout | undefined> {
    const row = await this.db('feature_flag_rollouts')
      .join('feature_flags', 'feature_flags.id', 'feature_flag_rollouts.feature_flag_id')
      .where('feature_flags.key', flagKey)
      .first('feature_flag_rollouts.*');

    if (!row) return undefined;

    return {
      flagKey,
      percentage: row.percentage,
      hashKey: row.hash_key,
    };
  }

  async getSchedule(flagKey: string): Promise<FeatureSchedule | undefined> {
    const row = await this.db('feature_flag_schedules')
      .join('feature_flags', 'feature_flags.id', 'feature_flag_schedules.feature_flag_id')
      .where('feature_flags.key', flagKey)
      .first('feature_flag_schedules.*');

    if (!row) return undefined;

    return {
      flagKey,
      enabledFrom: row.enabled_from,
      enabledUntil: row.enabled_until,
    };
  }

  async getDependencies(flagKey: string): Promise<FeatureDependency[]> {
    const rows = await this.db('feature_flag_dependencies')
      .join('feature_flags as f1', 'f1.id', 'feature_flag_dependencies.feature_flag_id')
      .join('feature_flags as f2', 'f2.id', 'feature_flag_dependencies.depends_on_feature_id')
      .where('f1.key', flagKey)
      .select('feature_flag_dependencies.*', 'f2.key as depends_on_key');

    return rows.map((row: any) => ({
      flagKey,
      dependsOnFlagKey: row.depends_on_key,
      type: row.type,
    }));
  }
}
