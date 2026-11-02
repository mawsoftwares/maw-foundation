import { Router } from 'express';
import type { ModuleRegistry } from '@mawsoftwares/rbac-core';
import type { MawModule, ModuleHostServices } from './contract';

/** Raised for invalid module configuration; `issues` lists every problem found. */
export class ModuleConfigurationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid module configuration:\n- ${issues.join('\n- ')}`);
    this.name = 'ModuleConfigurationError';
  }
}

export interface ModuleSelection {
  /** Module keys to enable. `undefined` enables every supplied module. */
  readonly enabled?: ReadonlySet<string>;
}

const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function collectIssues(registry: ModuleRegistry, modules: readonly MawModule[], selection: ModuleSelection): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const { definition } of modules) {
    const { key, version } = definition;
    if (seen.has(key)) issues.push(`Duplicate module id "${key}" in the supplied modules`);
    seen.add(key);
    if (registry.isRegistered(key)) issues.push(`Module "${key}" is already registered`);
    if (!SEMVER.test(version)) issues.push(`Module "${key}" has invalid version "${version}" (expected semver)`);
  }

  const isEnabled = (key: string): boolean => selection.enabled === undefined || selection.enabled.has(key);
  for (const key of selection.enabled ?? []) {
    if (!seen.has(key)) issues.push(`Enabled module "${key}" was not supplied`);
  }

  for (const { definition } of modules) {
    if (!isEnabled(definition.key)) continue;
    for (const dep of definition.dependencies ?? []) {
      if (dep.optional === true) continue;
      const suppliedAndEnabled = seen.has(dep.moduleKey) && isEnabled(dep.moduleKey);
      const alreadyAvailable = registry.isRegistered(dep.moduleKey) && registry.getStatus(dep.moduleKey) !== 'disabled';
      if (!suppliedAndEnabled && !alreadyAvailable) {
        issues.push(`Module "${definition.key}" requires "${dep.moduleKey}", which is not available (missing or disabled)`);
      }
    }
  }
  return issues;
}

/**
 * Registers `modules` in `registry`, disables those not selected and enables the rest in
 * dependency order. All validation runs before the registry is touched, so a configuration
 * error leaves it unchanged. Returns the enabled modules.
 *
 * Not enforced (not supported by the Foundation registry): `minVersion` of dependencies and
 * dependency cycles.
 */
export async function registerModules(
  registry: ModuleRegistry,
  modules: readonly MawModule[],
  selection: ModuleSelection = {},
): Promise<readonly MawModule[]> {
  const issues = collectIssues(registry, modules, selection);
  if (issues.length > 0) throw new ModuleConfigurationError(issues);

  registry.register(...modules.map((m) => m.definition));

  const enabled: MawModule[] = [];
  for (const m of modules) {
    if (selection.enabled === undefined || selection.enabled.has(m.definition.key)) enabled.push(m);
    else await registry.disable(m.definition.key);
  }

  const order = registry.getInitOrder();
  enabled.sort((a, b) => order.indexOf(a.definition.key) - order.indexOf(b.definition.key));
  for (const m of enabled) {
    try {
      await registry.enable(m.definition.key);
    } catch (err) {
      throw new ModuleConfigurationError([err instanceof Error ? err.message : String(err)]);
    }
  }
  return enabled;
}

/**
 * Brings `modules` to the state described by `selection` in a registry that may already know
 * some of them (e.g. definitions registered at import time so seeds can read their permissions):
 * unknown modules are registered strictly via `registerModules`; already-registered ones are
 * enabled or disabled. Safe to call again on the same registry. Returns the enabled modules.
 */
export async function installModules(
  registry: ModuleRegistry,
  modules: readonly MawModule[],
  selection: ModuleSelection = {},
): Promise<readonly MawModule[]> {
  const known = modules.filter((m) => registry.isRegistered(m.definition.key));
  const pending = modules.filter((m) => !registry.isRegistered(m.definition.key));
  const pendingKeys = new Set(pending.map((m) => m.definition.key));

  await registerModules(
    registry,
    pending,
    selection.enabled === undefined ? {} : { enabled: new Set([...selection.enabled].filter((k) => pendingKeys.has(k))) },
  );

  const order = registry.getInitOrder();
  const isSelected = (m: MawModule): boolean => selection.enabled === undefined || selection.enabled.has(m.definition.key);
  const toDisable = known.filter((m) => !isSelected(m));
  const toEnable = known.filter(isSelected).sort((a, b) => order.indexOf(a.definition.key) - order.indexOf(b.definition.key));
  try {
    for (const m of toDisable) if (registry.getStatus(m.definition.key) !== 'disabled') await registry.disable(m.definition.key);
    for (const m of toEnable) if (registry.getStatus(m.definition.key) !== 'enabled') await registry.enable(m.definition.key);
  } catch (err) {
    throw new ModuleConfigurationError([err instanceof Error ? err.message : String(err)]);
  }
  return modules.filter((m) => registry.isEnabled(m.definition.key));
}

const mounted = new WeakMap<object, Set<string>>();

/**
 * Calls `registerRoutes` for every enabled module and mounts its router at `routePrefix` on `host`.
 * Disabled modules are skipped; mounting the same module twice on one host is an error.
 */
export function mountModuleRoutes(
  host: Pick<Router, 'use'>,
  registry: ModuleRegistry,
  modules: readonly MawModule[],
  services: ModuleHostServices,
): void {
  const done = mounted.get(host) ?? new Set<string>();
  for (const m of modules) {
    const { key, routePrefix } = m.definition;
    if (!registry.isEnabled(key) || m.registerRoutes === undefined) continue;
    if (done.has(key)) throw new ModuleConfigurationError([`Routes of module "${key}" are already mounted on this host`]);
    const router = Router();
    m.registerRoutes({ ...services, router, config: registry.getConfig(key) });
    host.use(routePrefix, router);
    done.add(key);
  }
  mounted.set(host, done);
}
