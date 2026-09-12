import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import {
  createTheme,
  mergeThemeOverrides,
  tokensToRNStyles,
  type Theme,
  type ThemeOverrides,
  type TenantBranding,
  type RNStyles,
} from '@mawsoftwares/theme';

export type ColorMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  styles: RNStyles;
  colorMode: ColorMode;
  isDark: boolean;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  applyBranding: (branding: TenantBranding) => void;
  applyThemeOverrides: (next: ThemeOverrides) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveIsDark(mode: ColorMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return Appearance.getColorScheme() === 'dark';
}

export interface NativeThemeProviderProps {
  readonly overrides?: ThemeOverrides;
  readonly defaultColorMode?: ColorMode;
  readonly children: ReactNode;
}

export function NativeThemeProvider({ overrides, defaultColorMode = 'system', children }: NativeThemeProviderProps): ReactNode {
  const [customOverrides, setCustomOverrides] = useState<ThemeOverrides | null>(null);
  const [theme, setTheme] = useState<Theme>(() => createTheme(overrides));
  const [colorMode, setColorModeState] = useState<ColorMode>(defaultColorMode);
  const [isDark, setIsDark] = useState(() => resolveIsDark(defaultColorMode));

  useEffect(() => {
    setTheme(createTheme(mergeThemeOverrides(overrides, customOverrides ?? undefined)));
  }, [overrides, customOverrides]);

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

  const styles = useMemo(() => tokensToRNStyles(isDark, theme), [isDark, theme]);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      return resolveIsDark('system') ? 'light' : 'dark';
    });
  }, []);

  const applyThemeOverrides = useCallback((next: ThemeOverrides) => {
    setCustomOverrides(next);
  }, []);

  const applyBranding = useCallback((branding: TenantBranding) => {
    const palette: ThemeOverrides['palette'] = {};
    if (branding.primaryColor) {
      palette.brand = branding.primaryColor;
      palette.borderFocus = branding.primaryColor;
    }
    if (branding.secondaryColor) palette.brandLight = branding.secondaryColor;
    if (branding.accentColor) palette.brandDark = branding.accentColor;
    setCustomOverrides({ branding, palette });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, styles, colorMode, isDark, setColorMode, toggleColorMode, applyBranding, applyThemeOverrides }),
    [theme, styles, colorMode, isDark, setColorMode, toggleColorMode, applyBranding, applyThemeOverrides],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useNativeTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useNativeTheme must be used within <NativeThemeProvider>');
  return ctx;
}

export function useColors() {
  return useNativeTheme().styles.colors;
}

export function useSpacing() {
  return useNativeTheme().styles.spacing;
}

export { type Theme, type ThemeOverrides, type TenantBranding, type ShellTokens, type RNStyles } from '@mawsoftwares/theme';
