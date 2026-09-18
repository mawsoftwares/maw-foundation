import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

// Menu Management: an admin-editable navigation tree (menu_items table), so
// nav structure can change without a code deploy. This module also carries
// Manage_Rbac — RBAC administration (roles/permissions/module-permission
// assignments) has no natural home of its own and is equally an
// admin-settings concern, so it's registered here rather than adding a
// dedicated module just for one permission.
export const menusModule: ModuleDefinition = {
  key: 'menus',
  name: 'Menu Management',
  routePrefix: '/api/v1/menus',
  audience: 'admin',
  permissions: [
    { code: 'Manage_Menus', name: 'Manage Menus', description: 'Create, edit, reorder, and delete navigation menu items' },
    { code: 'Manage_Rbac', name: 'Manage RBAC', description: 'Manage roles, permissions, and module-permission assignments' },
  ],
  featureSync: {
    code: 'menus',
    name: 'Menu Management',
    groupCode: 'settings',
    routePath: '/admin/menus',
    icon: 'menu',
    sortOrder: 11,
    description: 'Manage the application navigation menu',
  },
};
