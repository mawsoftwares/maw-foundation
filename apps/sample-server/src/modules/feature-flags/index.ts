import { type ModuleDefinition } from '@mawsoftwares/rbac-core';

export const featureFlagsModule: ModuleDefinition = {
  key: 'feature-flags',
  name: 'Feature Flags',
  audience: 'admin',
  actions: ['Read', 'Create', 'Update', 'Delete'],
};
