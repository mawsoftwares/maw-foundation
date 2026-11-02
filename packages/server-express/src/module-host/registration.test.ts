import { describe, it, expect } from 'vitest';
import express, { type RequestHandler } from 'express';
import { createLogger } from '@mawsoftwares/sdk';
import { ModuleRegistry } from '@mawsoftwares/rbac-core';
import type { MawModule, ModuleHostServices } from './contract';
import { installModules, ModuleConfigurationError, mountModuleRoutes, registerModules } from './registration';

function mod(key: string, extra: Partial<MawModule['definition']> = {}, registerRoutes?: MawModule['registerRoutes']): MawModule {
  return {
    definition: { key, name: key, version: '1.0.0', routePrefix: `/api/${key}`, ...extra },
    ...(registerRoutes !== undefined ? { registerRoutes } : {}),
  };
}

const allow: RequestHandler = (_req, _res, next) => next();
const services: ModuleHostServices = { log: createLogger('test'), requireAuth: allow, requirePermission: () => allow };

async function expectIssues(p: Promise<unknown>, fragment: string): Promise<void> {
  const err = await p.then(() => undefined, (e: unknown) => e);
  expect(err).toBeInstanceOf(ModuleConfigurationError);
  if (!(err instanceof ModuleConfigurationError)) throw new Error('unreachable');
  expect(err.issues.join('\n')).toContain(fragment);
}

describe('registerModules', () => {
  it('rejects duplicate ids in the supplied list and leaves the registry unchanged', async () => {
    const registry = new ModuleRegistry();
    await expectIssues(registerModules(registry, [mod('a'), mod('a')]), 'Duplicate module id "a"');
    expect(registry.size).toBe(0);
  });

  it('rejects a module that is already registered (no double registration)', async () => {
    const registry = new ModuleRegistry();
    await registerModules(registry, [mod('a')]);
    await expectIssues(registerModules(registry, [mod('a')]), 'already registered');
    expect(registry.size).toBe(1);
  });

  it('rejects an invalid version', async () => {
    await expectIssues(registerModules(new ModuleRegistry(), [mod('a', { version: 'latest' })]), 'invalid version');
  });

  it('fails with a clear error when a required dependency is missing', async () => {
    const registry = new ModuleRegistry();
    await expectIssues(registerModules(registry, [mod('a', { dependencies: [{ moduleKey: 'b' }] })]), '"a" requires "b"');
    expect(registry.size).toBe(0);
  });

  it('fails when a required dependency is supplied but disabled', async () => {
    const registry = new ModuleRegistry();
    const modules = [mod('a', { dependencies: [{ moduleKey: 'b' }] }), mod('b')];
    await expectIssues(registerModules(registry, modules, { enabled: new Set(['a']) }), '"a" requires "b"');
    expect(registry.size).toBe(0);
  });

  it('tolerates a missing optional dependency', async () => {
    const registry = new ModuleRegistry();
    await registerModules(registry, [mod('a', { dependencies: [{ moduleKey: 'b', optional: true }] })]);
    expect(registry.isEnabled('a')).toBe(true);
  });

  it('accepts a dependency that is already registered in the registry', async () => {
    const registry = new ModuleRegistry();
    registry.register(mod('users').definition);
    await registerModules(registry, [mod('a', { dependencies: [{ moduleKey: 'users' }] })]);
    expect(registry.isEnabled('a')).toBe(true);
  });

  it('rejects enabling a module that was not supplied', async () => {
    await expectIssues(registerModules(new ModuleRegistry(), [mod('a')], { enabled: new Set(['zzz']) }), 'Enabled module "zzz"');
  });

  it('enables dependencies before dependents and runs lifecycle hooks', async () => {
    const calls: string[] = [];
    const hook = (k: string) => ({ onInit: () => { calls.push(k); } });
    const registry = new ModuleRegistry();
    await registerModules(registry, [
      mod('a', { dependencies: [{ moduleKey: 'b' }], lifecycle: hook('a') }),
      mod('b', { lifecycle: hook('b') }),
    ]);
    expect(calls).toEqual(['b', 'a']);
  });

  it('disabled modules contribute no menus; enabled modules do', async () => {
    const registry = new ModuleRegistry();
    const menu = (label: string) => ({ menus: [{ label, path: `/${label}` }] });
    await registerModules(registry, [mod('a', menu('a')), mod('b', menu('b'))], { enabled: new Set(['a']) });
    expect(registry.getAllMenus().map((m) => m.moduleKey)).toEqual(['a']);
    expect(registry.getDisabled().map((d) => d.key)).toEqual(['b']);
  });
});

describe('mountModuleRoutes', () => {
  async function get(app: express.Express, path: string): Promise<number> {
    const server = app.listen(0, '127.0.0.1');
    try {
      await new Promise<void>((r) => server.once('listening', () => r()));
      const address = server.address();
      if (address === null || typeof address === 'string') throw new Error('server has no TCP address');
      return (await fetch(`http://127.0.0.1:${address.port}${path}`)).status;
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  }

  it('mounts enabled modules under their prefix without the module starting a server', async () => {
    const registry = new ModuleRegistry();
    const m = mod('a', {}, (ctx) => { ctx.router.get('/ping', ctx.requireAuth, (_req, res) => { res.json({ ok: true }); }); });
    await registerModules(registry, [m]);
    const app = express();
    mountModuleRoutes(app, registry, [m], services);
    expect(await get(app, '/api/a/ping')).toBe(200);
  });

  it('does not mount routes of disabled modules', async () => {
    const registry = new ModuleRegistry();
    let called = false;
    const m = mod('a', {}, (ctx) => { called = true; ctx.router.get('/ping', (_req, res) => { res.json({}); }); });
    await registerModules(registry, [m], { enabled: new Set() });
    const app = express();
    mountModuleRoutes(app, registry, [m], services);
    expect(called).toBe(false);
    expect(await get(app, '/api/a/ping')).toBe(404);
  });

  it('refuses to mount the same module twice on one host', async () => {
    const registry = new ModuleRegistry();
    const m = mod('a', {}, () => undefined);
    await registerModules(registry, [m]);
    const app = express();
    mountModuleRoutes(app, registry, [m], services);
    expect(() => mountModuleRoutes(app, registry, [m], services)).toThrow(ModuleConfigurationError);
  });

  it('passes the host auth middleware and module config through the context', async () => {
    const registry = new ModuleRegistry();
    let sawAuth: RequestHandler | undefined;
    const m = mod('a', {}, (ctx) => { sawAuth = ctx.requireAuth; });
    await registerModules(registry, [m]);
    mountModuleRoutes(express(), registry, [m], services);
    expect(sawAuth).toBe(allow);
  });
});

describe('installModules', () => {
  it('registers unknown modules and enables/disables already-registered ones', async () => {
    const registry = new ModuleRegistry();
    registry.register(mod('a').definition, mod('b').definition);
    const enabled = await installModules(registry, [mod('a'), mod('b'), mod('c')], { enabled: new Set(['a', 'c']) });
    expect(enabled.map((m) => m.definition.key)).toEqual(['a', 'c']);
    expect(registry.getStatus('a')).toBe('enabled');
    expect(registry.getStatus('b')).toBe('disabled');
    expect(registry.getStatus('c')).toBe('enabled');
  });

  it('is repeatable on the same registry (no duplicate-registration error)', async () => {
    const registry = new ModuleRegistry();
    await installModules(registry, [mod('a')]);
    await expect(installModules(registry, [mod('a')])).resolves.toHaveLength(1);
    expect(registry.size).toBe(1);
  });

  it('refuses to disable a module that an enabled module requires', async () => {
    const registry = new ModuleRegistry();
    registry.register(mod('base').definition, mod('dep', { dependencies: [{ moduleKey: 'base' }] }).definition);
    await installModules(registry, [mod('base'), mod('dep', { dependencies: [{ moduleKey: 'base' }] })]);
    await expect(installModules(registry, [mod('base')], { enabled: new Set() })).rejects.toBeInstanceOf(ModuleConfigurationError);
  });
});
