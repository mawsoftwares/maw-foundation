import type { BrandConfig } from './types';
import { DEFAULT_BRAND_CONFIG } from './defaults';
import { normalizeBrandConfig, validateBrandConfig } from './validation';

export interface BrandResolverOptions {
  readonly cache?: IBrandCache;
  readonly provider: IBrandConfigProvider;
  readonly fallback?: BrandConfig;
}

export interface IBrandConfigProvider {
  load(tenantId: string): Promise<BrandConfig | null>;
}

export interface IBrandCache {
  get(tenantId: string): BrandConfig | null;
  set(tenantId: string, config: BrandConfig): void;
  invalidate(tenantId: string): void;
  clear(): void;
}

export interface BrandResolution {
  readonly config: BrandConfig;
  readonly source: 'cache' | 'provider' | 'fallback';
}

export class BrandResolver {
  private readonly provider: IBrandConfigProvider;
  private readonly cache: IBrandCache | null;
  private readonly fallback: BrandConfig;

  constructor(options: BrandResolverOptions) {
    this.provider = options.provider;
    this.cache = options.cache ?? null;
    this.fallback = options.fallback ?? DEFAULT_BRAND_CONFIG;
  }

  async resolve(tenantId: string): Promise<BrandResolution> {
    if (this.cache) {
      const cached = this.cache.get(tenantId);
      if (cached) return { config: cached, source: 'cache' };
    }

    try {
      const loaded = await this.provider.load(tenantId);
      if (loaded) {
        const errors = validateBrandConfig(loaded);
        if (errors.length === 0) {
          this.cache?.set(tenantId, loaded);
          return { config: loaded, source: 'provider' };
        }
        const normalized = normalizeBrandConfig({
          ...loaded,
          tenantId: loaded.tenantId || tenantId,
          name: loaded.name || tenantId,
        });
        this.cache?.set(tenantId, normalized);
        return { config: normalized, source: 'provider' };
      }
    } catch {
      // Provider failure — fall through to fallback
    }

    return { config: this.fallback, source: 'fallback' };
  }

  invalidate(tenantId: string): void {
    this.cache?.invalidate(tenantId);
  }

  clearCache(): void {
    this.cache?.clear();
  }
}

export class InMemoryBrandCache implements IBrandCache {
  private readonly store = new Map<string, { config: BrandConfig; expiresAt: number }>();
  private readonly ttlMs: number;

  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  get(tenantId: string): BrandConfig | null {
    const entry = this.store.get(tenantId);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(tenantId);
      return null;
    }
    return entry.config;
  }

  set(tenantId: string, config: BrandConfig): void {
    this.store.set(tenantId, { config, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(tenantId: string): void {
    this.store.delete(tenantId);
  }

  clear(): void {
    this.store.clear();
  }
}
