import { FeatureDependency } from '../domain/types.js';
import { DependencyType, EvaluationReason } from '../domain/enums.js';
import { PipelineEvaluator } from './PipelineEvaluator.js';
import { FeatureEvaluationContext } from '../domain/context.js';

export class DependencyEvaluator {
  constructor(private pipelineEvaluator: PipelineEvaluator) {}

  async evaluate(
    dependencies: FeatureDependency[],
    context: FeatureEvaluationContext,
    evaluatedFlags: Set<string> // the chain of flags being evaluated, for circular dependency detection
  ): Promise<{ passed: boolean; reason?: EvaluationReason }> {
    if (!dependencies || dependencies.length === 0) return { passed: true };

    for (const dep of dependencies) {
      if (evaluatedFlags.has(dep.dependsOnFlagKey)) {
        // Circular dependency detected, fail closed
        return { passed: false, reason: EvaluationReason.DEPENDENCY_DISABLED };
      }

      // Each dependency gets its own copy of the chain: siblings that share a dependency (a diamond: A needs B and C,
      // both need D) are not circular, only a flag that appears among its own ancestors is.
      const depResult = await this.pipelineEvaluator.evaluate(dep.dependsOnFlagKey, context, new Set(evaluatedFlags));

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
