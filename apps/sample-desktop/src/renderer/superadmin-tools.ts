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
  { key: 'theme', label: 'Theme Designer', description: 'Apply a live theme from a YAML or list design.md file', icon: 'palette', permission: 'Manage_Theme' },
  { key: 'messaging', label: 'Messaging', description: 'Manage Email, SMS, and WhatsApp templates, credentials, and send logs', icon: 'mail', permission: 'Read_Messaging' },
  { key: 'audit-logs', label: 'Audit Logs', description: 'View system activity and security events', icon: 'scroll-text', permission: 'Read_AuditLogs' },
  { key: 'settings', label: 'Settings', description: 'System-wide settings', icon: 'settings' },
  { key: 'showcase', label: 'UI Showcase', description: 'Browse the design system components', icon: 'palette' },
];
