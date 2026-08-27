import { FeatureOverride, FlagScope, FlagState } from '../domain/types.js';
import { FeatureEvaluationContext } from '../domain/context.js';
import { EvaluationReason } from '../domain/enums.js';

export class ScopeEvaluator {
  /**
   * Evaluates the flag state based on scope precedence:
   * USER > TENANT > PRODUCT > ENVIRONMENT > GLOBAL
   */
  evaluate(
    overrides: FeatureOverride[],
    context: FeatureEvaluationContext,
    defaultValue: boolean
  ): { enabled: boolean; reason: EvaluationReason; scope?: FlagScope } {
    // 1. USER
    if (context.userId) {
      const userOverride = overrides.find((o) => o.scope === FlagScope.USER && o.scopeId === context.userId);
      if (userOverride && userOverride.state !== FlagState.INHERIT) {
        return {
          enabled: userOverride.state === FlagState.ON,
          reason: EvaluationReason.USER_OVERRIDE,
          scope: FlagScope.USER,
        };
      }
    }

    // 2. TENANT
    if (context.tenantId) {
      const tenantOverride = overrides.find((o) => o.scope === FlagScope.TENANT && o.scopeId === context.tenantId);
      if (tenantOverride && tenantOverride.state !== FlagState.INHERIT) {
        return {
          enabled: tenantOverride.state === FlagState.ON,
          reason: EvaluationReason.TENANT_OVERRIDE,
          scope: FlagScope.TENANT,
        };
      }
    }

    // 3. PRODUCT
    if (context.productId) {
      const productOverride = overrides.find((o) => o.scope === FlagScope.PRODUCT && o.scopeId === context.productId);
      if (productOverride && productOverride.state !== FlagState.INHERIT) {
        return {
          enabled: productOverride.state === FlagState.ON,
          reason: EvaluationReason.PRODUCT_OVERRIDE,
          scope: FlagScope.PRODUCT,
        };
      }
    }

    // 4. ENVIRONMENT
    if (context.environment) {
      const envOverride = overrides.find((o) => o.scope === FlagScope.ENVIRONMENT && o.scopeId === context.environment);
      if (envOverride && envOverride.state !== FlagState.INHERIT) {
        return {
          enabled: envOverride.state === FlagState.ON,
          reason: EvaluationReason.ENVIRONMENT_OVERRIDE,
          scope: FlagScope.ENVIRONMENT,
        };
      }
    }

    // 5. GLOBAL
    const globalOverride = overrides.find((o) => o.scope === FlagScope.GLOBAL);
    if (globalOverride && globalOverride.state !== FlagState.INHERIT) {
      // For global scope, 'ON' or 'OFF' apply directly
      return {
        enabled: globalOverride.state === FlagState.ON,
        reason: EvaluationReason.GLOBAL_DEFAULT,
        scope: FlagScope.GLOBAL,
      };
    }

    // 6. DEFAULT (If everything is INHERIT or missing)
    return {
      enabled: defaultValue,
      reason: EvaluationReason.GLOBAL_DEFAULT,
    };
  }
}
