import type { Permission } from '@maw/sdk/contracts/IAuthorization';
import type { RbacConfig, TenantRolePolicy } from './types';

/**
 * A neutral EXAMPLE RBAC vocabulary — used by the sample apps and tests to prove the
 * resolver. Products override this with their own capabilities/permissions/roles; the
 * resolver algorithm is unchanged. (Restaurant OS ships a POS vocabulary; Sushmapet a
 * manufacturing one — both are just different `RbacConfig` values.)
 */
const ADMIN: readonly Permission[] = ['users.manage', 'settings.write'];
const REPORTS: readonly Permission[] = ['reports.view', 'reports.export'];
const ORDERS: readonly Permission[] = ['orders.view', 'orders.create', 'orders.edit'];
const INVENTORY: readonly Permission[] = ['inventory.view', 'inventory.adjust'];
const BILLING: readonly Permission[] = ['billing.create', 'payments.create'];

export const EXAMPLE_CAPABILITIES = ['admin', 'reports', 'orders', 'inventory', 'billing'] as const;

export const EXAMPLE_CAPABILITY_PERMISSIONS: Readonly<Record<string, readonly Permission[]>> = {
  admin: ADMIN,
  reports: REPORTS,
  orders: ORDERS,
  inventory: INVENTORY,
  billing: BILLING,
};

const ALL: readonly Permission[] = [...ADMIN, ...REPORTS, ...ORDERS, ...INVENTORY, ...BILLING];

export const EXAMPLE_DEFAULT_ROLE_POLICY: TenantRolePolicy = {
  owner: ALL,
  admin: ALL,
  manager: [...REPORTS, ...ORDERS, ...BILLING],
  clerk: [...ORDERS, ...BILLING],
  viewer: ['orders.view', 'inventory.view'],
};

/** The example config, ready to hand to `resolveEffectiveAccess`. */
export const EXAMPLE_RBAC: RbacConfig = {
  capabilities: EXAMPLE_CAPABILITIES,
  capabilityPermissions: EXAMPLE_CAPABILITY_PERMISSIONS,
  superuserRoles: ['owner', 'super_admin'],
  defaultRolePolicy: EXAMPLE_DEFAULT_ROLE_POLICY,
  // ABAC demo: a viewer may export a report, but only for their own scope (plant).
  conditionalGrants: {
    viewer: [
      {
        permission: 'reports.export',
        when: (ctx) => ctx.plantId !== undefined && ctx.plantId === ctx.ownPlantId,
      },
    ],
  },
};
