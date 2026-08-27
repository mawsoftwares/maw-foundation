import { FeatureEvaluationContext } from '../domain/context.js';
import { EvaluationReason } from '../domain/enums.js';
import { EvaluationResult } from '../domain/types.js';
import { ScopeEvaluator } from './ScopeEvaluator.js';
import { RolloutEvaluator } from './RolloutEvaluator.js';
import { TargetingEvaluator } from './TargetingEvaluator.js';
import { ScheduleEvaluator } from './ScheduleEvaluator.js';
import { DependencyEvaluator } from './DependencyEvaluator.js';
import { FeatureFlagRepository } from '../repositories/FeatureFlagRepository.js';

export class PipelineEvaluator {
  private scopeEvaluator = new ScopeEvaluator();
  private rolloutEvaluator = new RolloutEvaluator();
  private targetingEvaluator = new TargetingEvaluator();
  private scheduleEvaluator = new ScheduleEvaluator();
  private dependencyEvaluator: DependencyEvaluator;

  constructor(private repository: FeatureFlagRepository) {
    this.dependencyEvaluator = new DependencyEvaluator(this);
  }

  async evaluate(
    flagKey: string,
    context: FeatureEvaluationContext,
    evaluatedFlags: Set<string> = new Set()
  ): Promise<EvaluationResult> {
    evaluatedFlags.add(flagKey);

    // 1. Load effective configuration (cache-first via repository)
    const def = await this.repository.getDefinition(flagKey);
    if (!def) {
      return { enabled: false, reason: EvaluationReason.FLAG_DISABLED, feature: flagKey };
    }

    if (!def.isActive) {
      return { enabled: false, reason: EvaluationReason.FLAG_DISABLED, feature: flagKey };
    }

    const overrides = await this.repository.getOverrides(flagKey);
    const rules = await this.repository.getTargetingRules(flagKey);
    const rollout = await this.repository.getRollout(flagKey);
    const schedule = await this.repository.getSchedule(flagKey);
    const dependencies = await this.repository.getDependencies(flagKey);

    // 2. Scope Evaluator determines base value
    const scopeResult = this.scopeEvaluator.evaluate(overrides, context, def.defaultValue);
    if (!scopeResult.enabled) {
      return { enabled: false, reason: scopeResult.reason, feature: flagKey, scope: scopeResult.scope };
    }

    // 3. Schedule Evaluator
    if (!this.scheduleEvaluator.evaluate(schedule)) {
      return { enabled: false, reason: EvaluationReason.SCHEDULE_INACTIVE, feature: flagKey, scope: scopeResult.scope };
    }

    // 4. Targeting Evaluator
    if (!this.targetingEvaluator.evaluate(rules, context)) {
      return { enabled: false, reason: EvaluationReason.TARGETING_EXCLUDED, feature: flagKey, scope: scopeResult.scope };
    }

    // 5. Rollout Evaluator
    const rolloutResult = this.rolloutEvaluator.evaluate(rollout, context);
    if (rolloutResult === false) {
      return { enabled: false, reason: EvaluationReason.ROLLOUT, feature: flagKey, scope: scopeResult.scope };
    }

    // 6. Dependency Evaluator
    const depResult = await this.dependencyEvaluator.evaluate(dependencies, context, evaluatedFlags);
    if (!depResult.passed) {
      return { enabled: false, reason: depResult.reason!, feature: flagKey, scope: scopeResult.scope };
    }

    return {
      enabled: true,
      reason: scopeResult.reason,
      feature: flagKey,
      scope: scopeResult.scope,
    };
  }
}
