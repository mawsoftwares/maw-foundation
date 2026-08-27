import { FeatureFlagService } from './FeatureFlagService.js';
import { FeatureEvaluationContext } from '../domain/context.js';
import { EvaluationReason } from '../domain/enums.js';

export interface UnifiedAccessResult {
  allowed: boolean;
  feature: string;
  reasons: string[];
}

export interface BillingServiceContract {
  hasEntitlement(tenantId: string, featureKey: string): Promise<boolean>;
}

export interface RBACServiceContract {
  can(userId: string, tenantId: string, permission: string): Promise<boolean>;
}

export class FeatureAccessService {
  constructor(
    private featureFlags: FeatureFlagService,
    private billingService?: BillingServiceContract,
    private rbacService?: RBACServiceContract
  ) {}

  async canAccess(
    featureKey: string,
    context: FeatureEvaluationContext,
    requiredPermission?: string
  ): Promise<UnifiedAccessResult> {
    const reasons: string[] = [];
    let allowed = true;

    // 1. Feature Flag Evaluation
    const flagResult = await this.featureFlags.evaluate(featureKey, context);
    if (!flagResult.enabled) {
      allowed = false;
      reasons.push(flagResult.reason);
    }

    // 2. Billing Entitlement Evaluation (If tenant scoped and billing service provided)
    if (allowed && this.billingService && context.tenantId) {
      const hasEntitlement = await this.billingService.hasEntitlement(context.tenantId, featureKey);
      if (!hasEntitlement) {
        allowed = false;
        reasons.push(EvaluationReason.BILLING_DISABLED);
      }
    }

    // 3. RBAC Permission Evaluation (If required permission provided)
    if (allowed && this.rbacService && requiredPermission && context.userId && context.tenantId) {
      const hasPermission = await this.rbacService.can(context.userId, context.tenantId, requiredPermission);
      if (!hasPermission) {
        allowed = false;
        reasons.push(EvaluationReason.PERMISSION_DENIED);
      }
    }

    return {
      allowed,
      feature: featureKey,
      reasons,
    };
  }
}
