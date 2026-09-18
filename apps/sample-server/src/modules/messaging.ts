import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

// Messaging: Email/SMS/WhatsApp template management, provider credentials
// ("Masters"), and a send-attempt audit trail — ported from servicemate's
// message-templates / email-templates / integration-credentials /
// message-send-logs features.
export const messagingModule: ModuleDefinition = {
  key: 'messaging',
  name: 'Messaging',
  routePrefix: '/api/v1/messaging',
  audience: 'admin',
  permissions: [
    { code: 'Read_Messaging', name: 'Read Messaging', description: 'View email/SMS/WhatsApp templates, masters, and send logs' },
    { code: 'Manage_MessagingTemplates', name: 'Manage Messaging Templates', description: 'Create, edit, and delete email/SMS/WhatsApp templates' },
    { code: 'Manage_MessagingCredentials', name: 'Manage Messaging Credentials', description: 'Configure email/SMS/WhatsApp provider credentials (Masters)' },
    { code: 'Send_Messaging', name: 'Send Messaging', description: 'Send test/manual email, SMS, and WhatsApp messages' },
  ],
  featureSync: {
    code: 'messaging',
    name: 'Messaging',
    groupCode: 'settings',
    routePath: '/messaging',
    icon: 'mail',
    sortOrder: 89,
    description: 'Manage email, SMS and WhatsApp templates, credentials, and send logs',
  },
};
