import { PipelineEvaluator } from '../evaluators/PipelineEvaluator.js';
import { FeatureEvaluationContext } from '../domain/context.js';
import { EvaluationResult } from '../domain/types.js';
import { FeatureRegistry } from '../registry/FeatureRegistry.js';
import { EvaluationReason } from '../domain/enums.js';

export class FeatureFlagService {
  constructor(
    private pipeline: PipelineEvaluator,
    private registry: FeatureRegistry
  ) {}

  async isEnabled(flagKey: string, context: FeatureEvaluationContext): Promise<boolean> {
    const result = await this.evaluate(flagKey, context);
    return result.enabled;
  }

  async evaluate(flagKey: string, context: FeatureEvaluationContext): Promise<EvaluationResult> {
    // Return early if not in registry (optional: registry could be authoritative)
    const def = this.registry.get(flagKey);
    if (!def) {
      return { enabled: false, reason: EvaluationReason.FLAG_DISABLED, feature: flagKey };
    }

    try {
      return await this.pipeline.evaluate(flagKey, context);
    } catch (err) {
      console.error(`Evaluation failed for feature flag ${flagKey}:`, err);
      // Safe default handling
      return {
        enabled: def.failClosed ? false : def.defaultValue,
        reason: EvaluationReason.FALLBACK_SAFE_DEFAULT,
        feature: flagKey,
      };
    }
  }

  async getEffectiveFlags(context: FeatureEvaluationContext): Promise<Record<string, boolean>> {
    const allFlags = this.registry.list();
    const result: Record<string, boolean> = {};

    // For better performance, this can be parallelized or batched.
    const promises = allFlags.map(async (flag) => {
      const res = await this.evaluate(flag.key, context);
      result[flag.key] = res.enabled;
    });

    await Promise.all(promises);
    return result;
  }
}
