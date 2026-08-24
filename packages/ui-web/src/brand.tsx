import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BrandConfig, IBrandConfigProvider } from '@maw/sdk';
import { DEFAULT_BRAND_CONFIG, BrandResolver, InMemoryBrandCache } from '@maw/sdk';
import { brandConfigToThemeOverrides, createTheme, tokensToCssVars, type Theme } from '@maw/theme';

export type BrandColorMode = 'light' | 'dark' | 'system';

export interface BrandContextValue {
  readonly brand: BrandConfig;
  readonly theme: Theme;
  readonly colorMode: BrandColorMode;
  readonly isDark: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  setColorMode(mode: BrandColorMode): void;
  toggleColorMode(): void;
  switchTenant(tenantId: string): Promise<void>;
}

const BrandContext = createContext<BrandContextValue | null>(null);

const STORAGE_KEY = 'maw-brand-color-mode';

function getSystemPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveIsDark(mode: BrandColorMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return getSystemPreference();
}

function readStoredMode(): BrandColorMode | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return null;
}

export interface BrandProviderProps {
  readonly tenantId: string;
  readonly provider: IBrandConfigProvider;
  readonly fallback?: BrandConfig;
  readonly cacheTtlMs?: number;
  readonly children: ReactNode;
  readonly loadingFallback?: ReactNode;
}

export function BrandProvider({
  tenantId,
  provider,
  fallback,
  cacheTtlMs,
  children,
  loadingFallback,
}: BrandProviderProps): ReactNode {
  const resolver = useMemo(
    () => new BrandResolver({
      provider,
      cache: new InMemoryBrandCache(cacheTtlMs),
      fallback: fallback ?? DEFAULT_BRAND_CONFIG,
    }),
    [provider, cacheTtlMs, fallback],
  );

  const [brand, setBrand] = useState<BrandConfig>(fallback ?? DEFAULT_BRAND_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultMode = (brand.theme?.mode as BrandColorMode) ?? 'system';
  const [colorMode, setColorModeState] = useState<BrandColorMode>(() => readStoredMode() ?? defaultMode);
  const [isDark, setIsDark] = useState(() => resolveIsDark(colorMode));

  const theme = useMemo(() => {
    const overrides = brandConfigToThemeOverrides(brand);
    return createTheme(overrides);
  }, [brand]);

  const loadBrand = useCallback(async (tid: string) => {
    setLoading(true);
    setError(null);
    try {
      const resolution = await resolver.resolve(tid);
      setBrand(resolution.config);
    } catch (e) {
      setError((e as Error).message);
      setBrand(fallback ?? DEFAULT_BRAND_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [resolver, fallback]);

  useEffect(() => {
    void loadBrand(tenantId);
  }, [tenantId, loadBrand]);

  useEffect(() => {
    setIsDark(resolveIsDark(colorMode));
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, colorMode);
    }
  }, [colorMode]);

  useEffect(() => {
    if (colorMode !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [colorMode]);

  useEffect(() => {
    const vars = tokensToCssVars(isDark, theme);
    const root = document.documentElement;
    for (const [prop, val] of Object.entries(vars)) {
      root.style.setProperty(prop, val);
    }
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');

    if (brand.customTokens) {
      for (const [prop, val] of Object.entries(brand.customTokens)) {
        root.style.setProperty(`--maw-custom-${prop}`, val);
      }
    }
  }, [isDark, theme, brand.customTokens]);

  const setColorMode = useCallback((mode: BrandColorMode) => {
    setColorModeState(mode);
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      return getSystemPreference() ? 'light' : 'dark';
    });
  }, []);

  const switchTenant = useCallback(async (newTenantId: string) => {
    resolver.invalidate(newTenantId);
    await loadBrand(newTenantId);
  }, [resolver, loadBrand]);

  const value = useMemo<BrandContextValue>(
    () => ({ brand, theme, colorMode, isDark, loading, error, setColorMode, toggleColorMode, switchTenant }),
    [brand, theme, colorMode, isDark, loading, error, setColorMode, toggleColorMode, switchTenant],
  );

  if (loading && loadingFallback) {
    return <>{loadingFallback}</>;
  }

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (ctx === null) throw new Error('useBrand must be used within <BrandProvider>');
  return ctx;
}

export function useBrandColors() {
  const { brand } = useBrand();
  return brand.colors;
}

export function useBrandLogo() {
  const { brand, isDark } = useBrand();
  const logo = brand.logo;
  return isDark && logo.dark ? logo.dark : logo.light;
}
