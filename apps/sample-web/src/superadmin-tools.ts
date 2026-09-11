/**
 * The RBAC/Feature-Flags/Menu-Management/Showcase tools live under the "Super Admin"
 * hub page (see features/superadmin.tsx) instead of the top-level sidebar. They're
 * still real pages — App.tsx's PageContent still routes to them and gates each by
 * its own permission — just reached via a card on that hub rather than a direct nav
 * item. Kept in its own module (rather than in App.tsx) so the hub page can import it
 * without a circular App.tsx <-> features/superadmin.tsx dependency.
 */
export interface SuperAdminTool {
  key: string;
  label: string;
  description: string;
  icon: string;
  permission?: string;
}

export const SUPERADMIN_TOOLS: SuperAdminTool[] = [
  { key: 'rbac', label: 'RBAC Admin', description: 'Manage roles, permissions, and modules', icon: 'key', permission: 'Manage_Rbac' },
  { key: 'menus', label: 'Menu Management', description: "Control the app's navigation sidebar", icon: 'menu', permission: 'Manage_Menus' },
  { key: 'feature-flags', label: 'Feature Flags', description: 'Enable or disable features per environment', icon: 'flag', permission: 'Read_FeatureFlags' },
  { key: 'theme', label: 'Theme Designer', description: 'Apply a live color theme from a design.md file', icon: 'palette', permission: 'Manage_Theme' },
  { key: 'messaging', label: 'Messaging', description: 'Manage Email, SMS, and WhatsApp templates, credentials, and send logs', icon: 'mail', permission: 'Read_Messaging' },
  { key: 'showcase', label: 'UI Showcase', description: 'Browse the design system components', icon: 'palette' },
];
