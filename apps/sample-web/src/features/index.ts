import { FeatureRegistry } from '@maw/ui-web';
import { UsersView } from './users';
import { ReportsView } from './reports';
import { OrdersView } from './orders';
import { InventoryView } from './inventory';
import { BillingView } from './billing';
import { AuditLogsView } from './audit-logs';
import { PlatformView } from './platform';
import { JobsView } from './jobs';
import { NotificationsView } from './notifications';

export const registry = new FeatureRegistry();

registry.register(
  { key: 'users', name: 'Users', permissions: ['Read_Users'], Panel: UsersView },
  { key: 'reports', name: 'Reports', permissions: ['Read_Reports'], Panel: ReportsView },
  { key: 'orders', name: 'Orders', permissions: ['Read_Orders', 'Create_Orders'], Panel: OrdersView },
  { key: 'inventory', name: 'Inventory', permissions: ['Read_Inventory'], Panel: InventoryView },
  { key: 'billing', name: 'Billing', permissions: ['Read_Billing', 'Create_Billing'], Panel: BillingView },
  { key: 'audit-logs', name: 'Audit Logs', permissions: ['Read_AuditLogs', 'Export_AuditLogs'], Panel: AuditLogsView },
  { key: 'platform', name: 'Platform', permissions: [], Panel: PlatformView },
  { key: 'jobs', name: 'Jobs', permissions: [], Panel: JobsView },
  { key: 'notifications', name: 'Notifications', permissions: [], Panel: NotificationsView },
);
