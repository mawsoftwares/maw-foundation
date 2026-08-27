import { FeatureTargetingRule } from '../domain/types.js';
import { FeatureEvaluationContext } from '../domain/context.js';

export class TargetingEvaluator {
  evaluate(rules: FeatureTargetingRule[], context: FeatureEvaluationContext): boolean {
    if (!rules || rules.length === 0) return true; // No rules means pass

    // All rules must match (AND condition)
    for (const rule of rules) {
      if (!this.evaluateRule(rule, context)) {
        return false;
      }
    }
    return true;
  }

  private evaluateRule(rule: FeatureTargetingRule, context: FeatureEvaluationContext): boolean {
    const attributeValue = this.resolveAttribute(rule.attribute, context);

    if (attributeValue === undefined || attributeValue === null) {
      return false; // If attribute is missing in context, fail the rule
    }

    switch (rule.operator) {
      case 'EQUALS':
        return attributeValue === rule.value;
      case 'NOT_EQUALS':
        return attributeValue !== rule.value;
      case 'IN':
        return Array.isArray(rule.value) && rule.value.includes(attributeValue as string);
      case 'NOT_IN':
        return Array.isArray(rule.value) && !rule.value.includes(attributeValue as string);
      case 'CONTAINS':
        return typeof attributeValue === 'string' && attributeValue.includes(rule.value as string);
      case 'STARTS_WITH':
        return typeof attributeValue === 'string' && attributeValue.startsWith(rule.value as string);
      case 'ENDS_WITH':
        return typeof attributeValue === 'string' && attributeValue.endsWith(rule.value as string);
      case 'GREATER_THAN':
        return typeof attributeValue === 'number' && typeof rule.value === 'number' && attributeValue > rule.value;
      case 'LESS_THAN':
        return typeof attributeValue === 'number' && typeof rule.value === 'number' && attributeValue < rule.value;
      default:
        return false;
    }
  }

  private resolveAttribute(attribute: string, context: FeatureEvaluationContext): unknown {
    if (attribute === 'tenantId') return context.tenantId;
    if (attribute === 'userId') return context.userId;
    if (attribute === 'productId') return context.productId;
    if (attribute === 'environment') return context.environment;
    if (attribute === 'plan') return context.plan;
    
    // Check inside attributes map
    if (context.attributes && attribute in context.attributes) {
      return context.attributes[attribute];
    }

    return undefined;
  }
}
