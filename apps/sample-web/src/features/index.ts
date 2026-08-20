import { FeatureRegistry } from '@maw/ui-web';
import { UsersPanel } from './users';
import { ReportsPanel } from './reports';
import { OrdersPanel } from './orders';
import { InventoryPanel } from './inventory';
import { BillingPanel } from './billing';
import { AuditLogsPanel } from './audit-logs';

/**
 * THE REGISTRY — the single place to plug in a new UI feature.
 *
 * To add a feature (mirrors the server `modules/index.ts`):
 *   1. Create a panel file that talks to that module's APIs
 *   2. Import it here
 *   3. Add it to registry.register(...) with the same `key` as the server module
 *   4. Done — FeatureHost gates the panel with the listed permissions
 */
export const registry = new FeatureRegistry();

registry.register(
  {
    key: 'users',
    name: 'Users',
    permissions: ['Read_Users'],
    Panel: UsersPanel,
  },
  {
    key: 'reports',
    name: 'Reports',
    permissions: ['Read_Reports'],
    Panel: ReportsPanel,
  },
  {
    key: 'orders',
    name: 'Orders',
    permissions: ['Read_Orders', 'Create_Orders'],
    Panel: OrdersPanel,
  },
  {
    key: 'inventory',
    name: 'Inventory',
    permissions: ['Read_Inventory'],
    Panel: InventoryPanel,
  },
  {
    key: 'billing',
    name: 'Billing',
    permissions: ['Read_Billing', 'Create_Billing'],
    Panel: BillingPanel,
  },
  {
    key: 'audit-logs',
    name: 'Audit Logs',
    permissions: ['Read_AuditLogs', 'Export_AuditLogs'],
    Panel: AuditLogsPanel,
  },
);
