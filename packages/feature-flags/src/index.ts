/**
 * @mawsoftwares/feature-flags — Tenant-aware feature flag foundation.
 *
 * Provides a centralized feature flag evaluation service supporting:
 *   - Global flags (apply to all tenants)
 *   - Tenant-specific overrides
 *   - User-level overrides
 *   - Environment-based flags
 *   - Percentage rollouts
 *
 * Applications must evaluate flags through the FeatureFlagService — never
 * scatter `if (tenant.features.x)` throughout code.
 */

// Re-export the lightweight flag store from sdk
export {
  createFlagStore,
  isRolledOut,
  type FlagStore,
  type FlagChangeListener,
} from '@mawsoftwares/sdk';

// ---------------------------------------------------------------------------
// Feature flag scopes
// ---------------------------------------------------------------------------

export type FlagScope = 'global' | 'environment' | 'tenant' | 'user';

export interface FeatureFlagDefinition {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly defaultValue: boolean;
  readonly scope: FlagScope;
}

// ---------------------------------------------------------------------------
// Tenant-aware feature flag overrides
// ---------------------------------------------------------------------------

export interface FlagOverride {
  readonly flagKey: string;
  readonly scope: FlagScope;
  readonly scopeId?: string; // tenantId, userId, or environment name
  readonly enabled: boolean;
}

// ---------------------------------------------------------------------------
// Feature flag evaluation context
// ---------------------------------------------------------------------------

export interface FlagEvaluationContext {
  readonly tenantId?: string;
  readonly userId?: string;
  readonly environment?: string;
  readonly attributes?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Feature flag store contract
// ---------------------------------------------------------------------------

export interface IFeatureFlagStore {
  getDefinitions(): Promise<readonly FeatureFlagDefinition[]>;
  getOverrides(context: FlagEvaluationContext): Promise<readonly FlagOverride[]>;
  setOverride(override: FlagOverride): Promise<void>;
  removeOverride(flagKey: string, scope: FlagScope, scopeId?: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Feature flag service
// ---------------------------------------------------------------------------

export class FeatureFlagService {
  private readonly definitions = new Map<string, FeatureFlagDefinition>();
  private readonly overrides: FlagOverride[] = [];

  registerFlags(...flags: FeatureFlagDefinition[]): void {
    for (const flag of flags) {
      this.definitions.set(flag.key, flag);
    }
  }

  addOverrides(...overrides: FlagOverride[]): void {
    this.overrides.push(...overrides);
  }

  clearOverrides(): void {
    this.overrides.length = 0;
  }

  isEnabled(flagKey: string, context?: FlagEvaluationContext): boolean {
    const def = this.definitions.get(flagKey);
    if (!def) return false;

    // Evaluate overrides from most specific to least specific
    // User > Tenant > Environment > Global
    const scopes: FlagScope[] = ['user', 'tenant', 'environment', 'global'];

    for (const scope of scopes) {
      const override = this.findOverride(flagKey, scope, context);
      if (override !== undefined) return override;
    }

    return def.defaultValue;
  }

  getDefinition(flagKey: string): FeatureFlagDefinition | undefined {
    return this.definitions.get(flagKey);
  }

  getAllDefinitions(): readonly FeatureFlagDefinition[] {
    return [...this.definitions.values()];
  }

  evaluateAll(context?: FlagEvaluationContext): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const [key] of this.definitions) {
      result[key] = this.isEnabled(key, context);
    }
    return result;
  }

  private findOverride(
    flagKey: string,
    scope: FlagScope,
    context?: FlagEvaluationContext,
  ): boolean | undefined {
    const scopeId = this.getScopeId(scope, context);

    for (const override of this.overrides) {
      if (override.flagKey !== flagKey) continue;
      if (override.scope !== scope) continue;

      if (scope === 'global') return override.enabled;
      if (scopeId && override.scopeId === scopeId) return override.enabled;
    }

    return undefined;
  }

  private getScopeId(scope: FlagScope, context?: FlagEvaluationContext): string | undefined {
    if (!context) return undefined;
    switch (scope) {
      case 'tenant':
        return context.tenantId;
      case 'user':
        return context.userId;
      case 'environment':
        return context.environment;
      default:
        return undefined;
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createFeatureFlagService(): FeatureFlagService {
  return new FeatureFlagService();
}
