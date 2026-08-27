import { describe, it, expect } from 'vitest';
import {
  createConfigEngine,
  applyTenantConfig,
  applyModuleConfig,
  type TenantConfig,
} from '../src/index';

describe('@mawsoftwares/config — ConfigEngine', () => {
  it('should return undefined for unset keys', () => {
    const engine = createConfigEngine();
    expect(engine.get('nonexistent')).toBeUndefined();
  });

  it('should load app-level config', () => {
    const engine = createConfigEngine();
    engine.loadLayer('app', { currency: 'INR', dateFormat: 'DD/MM/YYYY' });
    expect(engine.get('currency')).toBe('INR');
    expect(engine.get('dateFormat')).toBe('DD/MM/YYYY');
  });

  it('should override app config with tenant config (higher priority)', () => {
    const engine = createConfigEngine();
    engine.loadLayer('app', { currency: 'INR', dateFormat: 'DD/MM/YYYY' });
    engine.loadLayer('tenant', { currency: 'USD' });
    expect(engine.get('currency')).toBe('USD');
    expect(engine.get('dateFormat')).toBe('DD/MM/YYYY');
  });

  it('should deep-merge nested config', () => {
    const engine = createConfigEngine();
    engine.loadLayer('app', { billing: { invoicePrefix: 'INV', taxRate: 18 } });
    engine.loadLayer('tenant', { billing: { invoicePrefix: 'TINV' } });
    expect(engine.get('billing.invoicePrefix')).toBe('TINV');
    expect(engine.get('billing.taxRate')).toBe(18);
  });

  it('should throw on getRequired when value is missing', () => {
    const engine = createConfigEngine();
    expect(() => engine.getRequired('missing')).toThrow('Required config "missing"');
  });

  it('should support typed accessors', () => {
    const engine = createConfigEngine();
    engine.loadLayer('app', { port: '3000', debug: 'true', name: 'test' });
    expect(engine.getNumber('port')).toBe(3000);
    expect(engine.getBool('debug')).toBe(true);
    expect(engine.getString('name')).toBe('test');
  });

  it('should clear a layer', () => {
    const engine = createConfigEngine();
    engine.loadLayer('app', { x: 1 });
    engine.loadLayer('tenant', { x: 2 });
    expect(engine.get('x')).toBe(2);
    engine.clearLayer('tenant');
    expect(engine.get('x')).toBe(1);
  });

  it('should report has() correctly', () => {
    const engine = createConfigEngine();
    engine.loadLayer('app', { a: 1 });
    expect(engine.has('a')).toBe(true);
    expect(engine.has('b')).toBe(false);
  });

  it('should resolve all layers into a merged object', () => {
    const engine = createConfigEngine();
    engine.loadLayer('app', { a: 1 });
    engine.loadLayer('tenant', { b: 2 });
    const resolved = engine.resolve();
    expect(resolved).toEqual({ a: 1, b: 2 });
  });

  it('should notify listeners on change', () => {
    const engine = createConfigEngine();
    const changes: string[] = [];
    engine.onChange((path) => changes.push(path));
    engine.loadLayer('app', { x: 1, y: 2 });
    expect(changes).toContain('x');
    expect(changes).toContain('y');
  });
});

describe('@mawsoftwares/config — applyTenantConfig', () => {
  it('should apply tenant branding and localization', () => {
    const engine = createConfigEngine();
    const tenant: TenantConfig = {
      tenantId: 't1',
      tenantName: 'Acme Corp',
      localization: {
        currency: 'USD',
        timezone: 'America/New_York',
      },
      branding: {
        primaryColor: '#ff0000',
      },
    };
    applyTenantConfig(engine, tenant);
    expect(engine.get('tenant.id')).toBe('t1');
    expect(engine.get('tenant.name')).toBe('Acme Corp');
    expect(engine.get('defaultCurrency')).toBe('USD');
    expect(engine.get('defaultTimezone')).toBe('America/New_York');
  });
});

describe('@mawsoftwares/config — applyModuleConfig', () => {
  it('should load module-level config', () => {
    const engine = createConfigEngine();
    applyModuleConfig(engine, 'billing', { invoicePrefix: 'INV', taxRate: 18 });
    expect(engine.get('billing.invoicePrefix')).toBe('INV');
    expect(engine.get('billing.taxRate')).toBe(18);
  });
});
