import { ModuleRegistry } from '@maw/rbac-core';
import { usersModule } from './users';
import { reportsModule } from './reports';
import { ordersModule } from './orders';
import { inventoryModule } from './inventory';
import { billingModule } from './billing';
import { auditLogsModule } from './audit-logs';

/**
 * THE REGISTRY — the single place to plug in a new module.
 *
 * To add a module:
 *   1. Create a moduleDefinition file declaring key, name, permissions, featureSync
 *   2. Import it here
 *   3. Add it to registry.register(...)
 *   4. Done — permissions auto-sync to DB on boot, cache serves them, middleware enforces them
 */
export const registry = new ModuleRegistry();

registry.register(
  usersModule,
  reportsModule,
  ordersModule,
  inventoryModule,
  billingModule,
  auditLogsModule,
);
