import { describe, it, expect } from 'vitest';
import {
  validateBrandConfig,
  normalizeBrandConfig,
  DEFAULT_BRAND_CONFIG,
  BrandResolver,
  InMemoryBrandCache,
} from './index';
import type { BrandConfig, IBrandConfigProvider } from './index';

describe('validateBrandConfig', () => {
  it('rejects non-object input', () => {
    const errors = validateBrandConfig(null);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe('root');
  });

  it('requires tenantId', () => {
    const errors = validateBrandConfig({ name: 'Test', logo: { light: '/l.png' }, colors: { primary: '#000' } });
    expect(errors.some((e) => e.field === 'tenantId')).toBe(true);
  });

  it('requires name', () => {
    const errors = validateBrandConfig({ tenantId: 't1', logo: { light: '/l.png' }, colors: { primary: '#000' } });
    expect(errors.some((e) => e.field === 'name')).toBe(true);
  });

  it('rejects invalid primary color', () => {
    const errors = validateBrandConfig({
      tenantId: 't1', name: 'T', logo: { light: '/l.png' },
      colors: { primary: 'notacolor' },
    });
    expect(errors.some((e) => e.field === 'colors.primary')).toBe(true);
  });

  it('accepts valid hex colors', () => {
    const errors = validateBrandConfig({
      tenantId: 't1', name: 'T', logo: { light: '/l.png' },
      colors: { primary: '#1565C0', secondary: '#42A5F5' },
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts rgba colors', () => {
    const errors = validateBrandConfig({
      tenantId: 't1', name: 'T', logo: { light: '/l.png' },
      colors: { primary: 'rgba(21, 101, 192, 1)' },
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid theme mode', () => {
    const errors = validateBrandConfig({
      tenantId: 't1', name: 'T', logo: { light: '/l.png' },
      colors: { primary: '#000' }, theme: { mode: 'invalid' },
    });
    expect(errors.some((e) => e.field === 'theme.mode')).toBe(true);
  });

  it('rejects unsafe font family', () => {
    const errors = validateBrandConfig({
      tenantId: 't1', name: 'T', logo: { light: '/l.png' },
      colors: { primary: '#000' },
      typography: { fontFamily: '<script>alert(1)</script>' },
    });
    expect(errors.some((e) => e.field === 'typography.fontFamily')).toBe(true);
  });

  it('rejects invalid logo URL', () => {
    const errors = validateBrandConfig({
      tenantId: 't1', name: 'T', logo: { light: 'not a url <<>>' },
      colors: { primary: '#000' },
    });
    expect(errors.some((e) => e.field === 'logo.light')).toBe(true);
  });
});

describe('normalizeBrandConfig', () => {
  it('applies defaults for missing optional fields', () => {
    const result = normalizeBrandConfig({
      tenantId: 'acme',
      name: 'ACME Corp',
      colors: { primary: '#FF0000' },
    });
    expect(result.id).toBe('brand-acme');
    expect(result.logo.light).toBe(DEFAULT_BRAND_CONFIG.logo.light);
    expect(result.colors.primary).toBe('#FF0000');
    expect(result.theme?.mode).toBe('system');
    expect(result.theme?.radius).toBe(8);
  });

  it('preserves provided values', () => {
    const result = normalizeBrandConfig({
      tenantId: 'acme',
      name: 'ACME',
      colors: { primary: '#123456', secondary: '#654321' },
      theme: { mode: 'dark', radius: 4, density: 'compact' },
    });
    expect(result.colors.secondary).toBe('#654321');
    expect(result.theme?.mode).toBe('dark');
    expect(result.theme?.density).toBe('compact');
  });
});

describe('BrandResolver', () => {
  const mockBrand: BrandConfig = {
    id: 'brand-acme',
    tenantId: 'acme',
    version: 1,
    name: 'ACME',
    logo: { light: '/acme-logo.png' },
    colors: { primary: '#1565C0' },
  };

  it('resolves from provider', async () => {
    const provider: IBrandConfigProvider = { load: async () => mockBrand };
    const resolver = new BrandResolver({ provider });
    const result = await resolver.resolve('acme');
    expect(result.source).toBe('provider');
    expect(result.config.tenantId).toBe('acme');
  });

  it('uses cache on second call', async () => {
    let calls = 0;
    const provider: IBrandConfigProvider = {
      load: async () => { calls++; return mockBrand; },
    };
    const resolver = new BrandResolver({ provider, cache: new InMemoryBrandCache() });
    await resolver.resolve('acme');
    await resolver.resolve('acme');
    expect(calls).toBe(1);
  });

  it('falls back when provider returns null', async () => {
    const provider: IBrandConfigProvider = { load: async () => null };
    const resolver = new BrandResolver({ provider });
    const result = await resolver.resolve('unknown');
    expect(result.source).toBe('fallback');
    expect(result.config.tenantId).toBe(DEFAULT_BRAND_CONFIG.tenantId);
  });

  it('falls back when provider throws', async () => {
    const provider: IBrandConfigProvider = { load: async () => { throw new Error('Network error'); } };
    const resolver = new BrandResolver({ provider });
    const result = await resolver.resolve('acme');
    expect(result.source).toBe('fallback');
  });

  it('invalidate clears cached entry', async () => {
    let calls = 0;
    const provider: IBrandConfigProvider = {
      load: async () => { calls++; return mockBrand; },
    };
    const cache = new InMemoryBrandCache();
    const resolver = new BrandResolver({ provider, cache });
    await resolver.resolve('acme');
    resolver.invalidate('acme');
    await resolver.resolve('acme');
    expect(calls).toBe(2);
  });
});

describe('InMemoryBrandCache', () => {
  it('expires entries after TTL', () => {
    const cache = new InMemoryBrandCache(0);
    cache.set('t1', DEFAULT_BRAND_CONFIG);
    expect(cache.get('t1')).toBeNull();
  });

  it('returns valid entries before TTL', () => {
    const cache = new InMemoryBrandCache(60000);
    cache.set('t1', DEFAULT_BRAND_CONFIG);
    expect(cache.get('t1')).toEqual(DEFAULT_BRAND_CONFIG);
  });

  it('clear removes all entries', () => {
    const cache = new InMemoryBrandCache(60000);
    cache.set('t1', DEFAULT_BRAND_CONFIG);
    cache.set('t2', DEFAULT_BRAND_CONFIG);
    cache.clear();
    expect(cache.get('t1')).toBeNull();
    expect(cache.get('t2')).toBeNull();
  });
});
