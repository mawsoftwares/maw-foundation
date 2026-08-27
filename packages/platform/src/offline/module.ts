import type { BaseModuleDefinition } from '@mawsoftwares/sdk/modules/types';

export const offlineModule: BaseModuleDefinition = {
  key: 'offline',
  name: 'Offline Capability',
  description: 'Optional offline-first data access with background sync',
  level: 'engine',
  config: {
    fields: [
      { key: 'enabled', type: 'boolean', required: false, default: false, description: 'Enable offline support' },
      { key: 'storageQuotaMb', type: 'number', required: false, default: 50 },
      { key: 'syncIntervalMs', type: 'number', required: false, default: 30000 },
      { key: 'maxRetries', type: 'number', required: false, default: 3 },
      { key: 'conflictStrategy', type: 'string', required: false, default: 'last-write-wins' },
      { key: 'encryptionEnabled', type: 'boolean', required: false, default: true },
    ],
  },
  events: [
    { name: 'offline:status-changed', description: 'Network status changed' },
    { name: 'offline:sync-started', description: 'Background sync started' },
    { name: 'offline:sync-completed', description: 'Background sync completed' },
    { name: 'offline:sync-failed', description: 'Sync operation failed' },
    { name: 'offline:conflict-detected', description: 'Data conflict detected during sync' },
    { name: 'offline:storage-warning', description: 'Storage quota approaching limit' },
  ],
};
