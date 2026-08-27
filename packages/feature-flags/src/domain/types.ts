import { FlagScope, FlagState, RiskLevel, DependencyType, EvaluationReason } from './enums.js';

export interface FeatureDefinition {
  key: string;
  name: string;
  description?: string;
  defaultValue: boolean;
  isActive: boolean;
  failClosed: boolean;
  riskLevel: RiskLevel;
  metadata?: Record<string, unknown>;
}

export interface FeatureOverride {
  flagKey: string;
  scope: FlagScope;
  scopeId?: string; // e.g. tenant_id, environment_name
  state: FlagState;
}

export interface FeatureRollout {
  flagKey: string;
  percentage: number;
  hashKey: 'tenant_id' | 'user_id';
}

export interface FeatureSchedule {
  flagKey: string;
  enabledFrom: string; // ISO DateTime
  enabledUntil?: string; // ISO DateTime
}

export interface FeatureDependency {
  flagKey: string;
  dependsOnFlagKey: string;
  type: DependencyType;
}

export interface FeatureTargetingRule {
  flagKey: string;
  attribute: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'GREATER_THAN' | 'LESS_THAN';
  value: string | string[] | number;
}

export interface EvaluationResult {
  enabled: boolean;
  reason: EvaluationReason;
  feature: string;
  scope?: FlagScope;
  source?: string;
}
