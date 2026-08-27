import { FeatureRollout } from '../domain/types.js';
import { FeatureEvaluationContext } from '../domain/context.js';
// Using the existing sdk for rollout checking, or we can use a local deterministic hash
import { isRolledOut } from '@mawsoftwares/sdk';

export class RolloutEvaluator {
  evaluate(rollout: FeatureRollout | undefined, context: FeatureEvaluationContext): boolean | null {
    if (!rollout) return null; // Null means no rollout config applies
    
    let targetId: string | undefined;
    if (rollout.hashKey === 'user_id') {
      targetId = context.userId;
    } else {
      targetId = context.tenantId; // default to tenant_id
    }

    if (!targetId) {
      return false; // If targetId is missing, exclude from rollout
    }

    // We can use the existing isRolledOut logic, or implement deterministic hashing here.
    // Assuming isRolledOut from @mawsoftwares/sdk is a function (targetId: string, percentage: number, flagKey: string) -> boolean
    return isRolledOut(targetId, rollout.percentage, rollout.flagKey);
  }
}
