import { FeatureAccessService } from '../services/FeatureAccessService.js';
import { FeatureEvaluationContext } from '../domain/context.js';

/**
 * Creates a middleware-agnostic guard function.
 * @param accessService The unified FeatureAccessService instance
 * @param extractContext A function to extract the FeatureEvaluationContext from the request object
 */
export function createFeatureGuard<RequestType>(
  accessService: FeatureAccessService,
  extractContext: (req: RequestType) => FeatureEvaluationContext
) {
  return (featureKey: string, requiredPermission?: string) => {
    return async (req: RequestType, res: any, next: (err?: any) => void) => {
      try {
        const context = extractContext(req);
        const result = await accessService.canAccess(featureKey, context, requiredPermission);
        
        if (!result.allowed) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FEATURE_DISABLED',
              message: `Feature disabled or access denied. Reasons: ${result.reasons.join(', ')}`,
            },
          });
        }
        
        next();
      } catch (err) {
        next(err);
      }
    };
  };
}
