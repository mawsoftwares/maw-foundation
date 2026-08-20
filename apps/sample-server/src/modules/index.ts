import { ModuleRegistry } from '@maw/rbac-core';
import { createLogger, RegistryEvent, type RegistryEventPayload } from '@maw/sdk';
import { usersModule } from './users';
import { reportsModule } from './reports';
import { ordersModule } from './orders';
import { inventoryModule } from './inventory';
import { billingModule } from './billing';
import { auditLogsModule } from './audit-logs';

const log = createLogger('registry');

/**
 * THE REGISTRY — the single place to plug in a new module.
 *
 * To add a module:
 *   1. Create a moduleDefinition file declaring key, name, permissions, featureSync
 *   2. Import it here
 *   3. Add it to registry.register(...)
 *   4. Done — permissions auto-sync to DB on boot, cache serves them, middleware enforces them
 *
 * The registry now also supports:
 *   - dependencies (validated on enable)
 *   - menus (aggregated via registry.getAllMenus())
 *   - events (inter-module pub/sub via registry.events)
 *   - config (per-module typed configuration)
 *   - lifecycle hooks (onRegister, onEnable, onDisable, onInit, onDestroy)
 */
export const registry = new ModuleRegistry();

registry.events.on<RegistryEventPayload>(RegistryEvent.MODULE_REGISTERED, (payload) => {
  log.debug('Module registered', { module: payload.moduleKey });
});

registry.register(
  usersModule,
  reportsModule,
  ordersModule,
  inventoryModule,
  billingModule,
  auditLogsModule,
);
