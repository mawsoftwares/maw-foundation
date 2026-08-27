import { FeatureFlagService } from '../services/FeatureFlagService.js';
import { FeatureEvaluationContext } from '../domain/context.js';

export function createFeatureFlagRoutes<RequestType, ResponseType>(
  featureFlags: FeatureFlagService,
  extractContext: (req: RequestType) => FeatureEvaluationContext,
  router: any
) {
  // GET /feature-flags/effective
  router.get('/feature-flags/effective', async (req: RequestType, res: any) => {
    try {
      const context = extractContext(req);
      const features = await featureFlags.getEffectiveFlags(context);
      
      return res.json({
        success: true,
        data: { features },
        message: null,
        meta: {}
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'FEATURE_EVALUATION_FAILED',
          message: 'Failed to evaluate feature flags'
        }
      });
    }
  });

  // Additional CRUD and Management routes would be defined here
  // using RBAC guards and taking dependencies on Repositories
}
