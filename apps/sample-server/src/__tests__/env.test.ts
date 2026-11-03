import { describe, it, expect, afterEach } from 'vitest';
import { EnvironmentError } from '@mawsoftwares/server-express';
import { readServerEnv } from '../env';

const KEYS = ['DATABASE_URL', 'PORT', 'JWT_SECRET', 'DISABLED_MODULES', 'TENANT_MODE', 'DEFAULT_TENANT_ID'] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('readServerEnv', () => {
  it('requires DATABASE_URL and reports every problem without echoing values', () => {
    delete process.env['DATABASE_URL'];
    process.env['PORT'] = 'not-a-number';
    const err = (() => { try { readServerEnv(); } catch (e) { return e; } })();
    expect(err).toBeInstanceOf(EnvironmentError);
    expect((err as EnvironmentError).issues).toEqual(['DATABASE_URL is required', 'PORT must be an integer']);
    expect(String(err)).not.toContain('not-a-number');
  });

  it('reads port and the disabled-module list', () => {
    process.env['DATABASE_URL'] = 'postgres://example.invalid/db';
    process.env['PORT'] = '4123';
    process.env['DISABLED_MODULES'] = 'billing, reports';
    const env = readServerEnv();
    expect(env.port).toBe(4123);
    expect(env.disabledModules).toEqual(['billing', 'reports']);
  });

  it('reads the single tenant from DEFAULT_TENANT_ID and refuses unsupported TENANT_MODE values', () => {
    process.env['DATABASE_URL'] = 'postgres://example.invalid/db';
    process.env['DEFAULT_TENANT_ID'] = ' acme ';
    expect(readServerEnv().defaultTenantId).toBe('acme');

    process.env['TENANT_MODE'] = 'subdomain';
    expect(() => readServerEnv()).toThrow(/TENANT_MODE must be "single"/);

    process.env['TENANT_MODE'] = 'single';
    process.env['DEFAULT_TENANT_ID'] = '  ';
    expect(() => readServerEnv()).toThrow(/DEFAULT_TENANT_ID must not be empty/);
  });
});
