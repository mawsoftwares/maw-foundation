import { FeatureDependency, DependencyType } from '../domain/types.js';
import { EvaluationReason } from '../domain/enums.js';
import { PipelineEvaluator } from './PipelineEvaluator.js';
import { FeatureEvaluationContext } from '../domain/context.js';

export class DependencyEvaluator {
  constructor(private pipelineEvaluator: PipelineEvaluator) {}

  async evaluate(
    dependencies: FeatureDependency[],
    context: FeatureEvaluationContext,
    evaluatedFlags: Set<string> // for circular dependency detection
  ): Promise<{ passed: boolean; reason?: EvaluationReason }> {
    if (!dependencies || dependencies.length === 0) return { passed: true };

    for (const dep of dependencies) {
      if (evaluatedFlags.has(dep.dependsOnFlagKey)) {
        // Circular dependency detected, fail closed
        return { passed: false, reason: EvaluationReason.DEPENDENCY_DISABLED };
      }

      const depResult = await this.pipelineEvaluator.evaluate(dep.dependsOnFlagKey, context, evaluatedFlags);

      if (dep.type === DependencyType.REQUIRES) {
        if (!depResult.enabled) {
          return { passed: false, reason: EvaluationReason.DEPENDENCY_DISABLED };
        }
      } else if (dep.type === DependencyType.CONFLICTS_WITH) {
        if (depResult.enabled) {
          return { passed: false, reason: EvaluationReason.DEPENDENCY_CONFLICT };
        }
      }
    }

    return { passed: true };
  }
}
