export interface FeatureEvaluationContext {
  tenantId?: string;
  userId?: string;
  productId?: string;
  environment?: string;
  roles?: string[];
  plan?: string;
  attributes?: Record<string, unknown>;
}
