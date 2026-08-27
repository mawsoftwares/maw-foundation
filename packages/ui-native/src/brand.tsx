import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import type { BrandConfig, IBrandConfigProvider } from '@mawsoftwares/sdk';
import { DEFAULT_BRAND_CONFIG, BrandResolver, InMemoryBrandCache } from '@mawsoftwares/sdk';
import { brandConfigToThemeOverrides, createTheme, tokensToRNStyles, type Theme, type RNStyles } from '@mawsoftwares/theme';

export type BrandColorMode = 'light' | 'dark' | 'system';

export interface BrandContextValue {
  readonly brand: BrandConfig;
  readonly theme: Theme;
  readonly styles: RNStyles;
  readonly colorMode: BrandColorMode;
  readonly isDark: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  setColorMode(mode: BrandColorMode): void;
  toggleColorMode(): void;
  switchTenant(tenantId: string): Promise<void>;
}

const BrandContext = createContext<BrandContextValue | null>(null);

function resolveIsDark(mode: BrandColorMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return Appearance.getColorScheme() === 'dark';
}

export interface NativeBrandProviderProps {
  readonly tenantId: string;
  readonly provider: IBrandConfigProvider;
  readonly fallback?: BrandConfig;
  readonly cacheTtlMs?: number;
  readonly children: ReactNode;
  readonly loadingFallback?: ReactNode;
}

export function NativeBrandProvider({
  tenantId,
  provider,
  fallback,
  cacheTtlMs,
  children,
  loadingFallback,
}: NativeBrandProviderProps): ReactNode {
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
  const [colorMode, setColorModeState] = useState<BrandColorMode>(defaultMode);
  const [isDark, setIsDark] = useState(() => resolveIsDark(colorMode));

  const theme = useMemo(() => {
    const overrides = brandConfigToThemeOverrides(brand);
    return createTheme(overrides);
  }, [brand]);

  const styles = useMemo(() => tokensToRNStyles(isDark, theme), [isDark, theme]);

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
  }, [colorMode]);

  useEffect(() => {
    if (colorMode !== 'system') return;
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDark(colorScheme === 'dark');
    });
    return () => subscription.remove();
  }, [colorMode]);

  const setColorMode = useCallback((mode: BrandColorMode) => {
    setColorModeState(mode);
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      return resolveIsDark('system') ? 'light' : 'dark';
    });
  }, []);

  const switchTenant = useCallback(async (newTenantId: string) => {
    resolver.invalidate(newTenantId);
    await loadBrand(newTenantId);
  }, [resolver, loadBrand]);

  const value = useMemo<BrandContextValue>(
    () => ({ brand, theme, styles, colorMode, isDark, loading, error, setColorMode, toggleColorMode, switchTenant }),
    [brand, theme, styles, colorMode, isDark, loading, error, setColorMode, toggleColorMode, switchTenant],
  );

  if (loading && loadingFallback) {
    return <>{loadingFallback}</>;
  }

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useNativeBrand(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (ctx === null) throw new Error('useNativeBrand must be used within <NativeBrandProvider>');
  return ctx;
}

export function useNativeBrandColors() {
  const { brand } = useNativeBrand();
  return brand.colors;
}

export function useNativeBrandLogo() {
  const { brand, isDark } = useNativeBrand();
  const logo = brand.logo;
  return isDark && logo.dark ? logo.dark : logo.light;
}
