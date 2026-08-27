import type { Permission, AuthzContext } from '@mawsoftwares/sdk/contracts/IAuthorization';
import type { EffectiveAccess, RbacConfig, UserAccessContext } from './types';

/** The module a permission belongs to, per this config (first occurrence wins). */
function buildPermissionModule(config: RbacConfig): Map<Permission, string> {
  const map = new Map<Permission, string>();
  for (const cap of config.capabilities) {
    for (const p of config.capabilityPermissions[cap] ?? []) {
      if (!map.has(p)) map.set(p, cap);
    }
  }
  return map;
}

/**
 * The single source of truth for "what can this user see and do, right now" — shared by
 * the client (navigation + action gates) and the server (endpoint enforcement) so the
 * decision is never duplicated.
 *
 * A role's permissions come from the tenant's editable policy, falling back to the
 * config's `defaultRolePolicy` (so an un-edited tenant behaves exactly as before). Active
 * modules (nav) = the modules those permissions belong to, plus per-user "work-as"
 * grants, all ∩ enabled ∩ subscription. `can()` keeps the ceiling: superusers hold every
 * permission; everyone else holds exactly what their *active* modules grant — plus any
 * ABAC conditional grant whose `when(context)` passes.
 *
 * Ported and generalized from Restaurant OS `resolveEffectiveAccess`; the vocabulary is
 * now injected via `config` rather than hardcoded, and an ABAC/scope path is added for
 * Sushmapet-style plant-scoping.
 */
export function resolveEffectiveAccess(
  ctx: UserAccessContext,
  config: RbacConfig,
): EffectiveAccess {
  const permissionModule = buildPermissionModule(config);
  const knownCapabilities = new Set(config.capabilities);
  const isEnabled = (module: string): boolean =>
    config.isModuleEnabled?.(module, ctx) ?? ctx.enabledModules.includes(module);

  const policy = ctx.rolePermissions ?? config.defaultRolePolicy;
  const rolePerms = policy[ctx.baseRole] ?? config.defaultRolePolicy[ctx.baseRole] ?? [];
  const granted = ctx.grantedCapabilities.filter((c) => knownCapabilities.has(c));

  // Candidate modules: those the role's permissions belong to, plus work-as grants.
  const candidate = new Set<string>(granted);
  for (const p of rolePerms) {
    const m = permissionModule.get(p);
    if (m !== undefined) candidate.add(m);
  }

  const active: string[] = ctx.subscriptionActive ? [...candidate].filter(isEnabled) : [];
  const activeSet = new Set<string>(active);

  // Effective permissions: role permissions whose module is active, plus the full
  // permission set of each active work-as capability.
  const activePermissions = new Set<Permission>();
  for (const p of rolePerms) {
    const m = permissionModule.get(p);
    if (m !== undefined && activeSet.has(m)) activePermissions.add(p);
  }
  for (const c of granted) {
    if (activeSet.has(c)) {
      for (const p of config.capabilityPermissions[c] ?? []) activePermissions.add(p);
    }
  }

  const isSuperuser = config.superuserRoles.includes(ctx.baseRole);
  const conditional = config.conditionalGrants?.[ctx.baseRole] ?? [];

  return {
    capabilities: active,
    can(permission: Permission, context?: AuthzContext): boolean {
      if (isSuperuser) return true;
      if (activePermissions.has(permission)) return true;
      // ABAC path: a conditional grant for this permission whose predicate passes over
      // the subject's bound scope merged with the call-site context.
      const facts: AuthzContext = { ...ctx.scope, ...context };
      return conditional.some(
        (g) => g.permission === permission && (g.when === undefined || g.when(facts)),
      );
    },
  };
}
