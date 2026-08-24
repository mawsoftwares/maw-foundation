import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import {
  createTheme,
  tokensToRNStyles,
  type Theme,
  type ThemeOverrides,
  type TenantBranding,
  type RNStyles,
} from '@maw/theme';

export type ColorMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  styles: RNStyles;
  colorMode: ColorMode;
  isDark: boolean;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  applyBranding: (branding: TenantBranding) => void;
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
  const [theme, setTheme] = useState<Theme>(() => createTheme(overrides));
  const [colorMode, setColorModeState] = useState<ColorMode>(defaultColorMode);
  const [isDark, setIsDark] = useState(() => resolveIsDark(defaultColorMode));

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

  const applyBranding = useCallback((branding: TenantBranding) => {
    setTheme(createTheme({ ...overrides, branding }));
  }, [overrides]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, styles, colorMode, isDark, setColorMode, toggleColorMode, applyBranding }),
    [theme, styles, colorMode, isDark, setColorMode, toggleColorMode, applyBranding],
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

export { type Theme, type ThemeOverrides, type TenantBranding, type RNStyles } from '@maw/theme';
