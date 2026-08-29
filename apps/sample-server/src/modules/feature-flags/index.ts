import { type ModuleDefinition } from '@mawsoftwares/rbac-core';

export const featureFlagsModule: ModuleDefinition = {
  key: 'feature-flags',
  name: 'Feature Flags',
  routePrefix: '/api/v1/feature-flags',
  source: 'foundation',
  audience: 'admin',
  permissions: [
    { code: 'Read_FeatureFlags',   name: 'Read Feature Flags',   description: 'View feature flags' },
    { code: 'Create_FeatureFlags', name: 'Create Feature Flags', description: 'Create feature flags' },
    { code: 'Update_FeatureFlags', name: 'Update Feature Flags', description: 'Edit feature flags' },
    { code: 'Delete_FeatureFlags', name: 'Delete Feature Flags', description: 'Remove feature flags' },
  ],
};
