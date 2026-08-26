import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createTheme,
  tokensToCssVars,
  type Theme,
  type ThemeOverrides,
  type TenantBranding,
} from '@maw/theme';

export type ColorMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  colorMode: ColorMode;
  isDark: boolean;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  applyBranding: (branding: TenantBranding) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'maw-color-mode';

function getSystemPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveIsDark(mode: ColorMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return getSystemPreference();
}

function readStoredMode(): ColorMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export interface ThemeProviderProps {
  readonly overrides?: ThemeOverrides;
  readonly defaultColorMode?: ColorMode;
  readonly children: ReactNode;
}

export function ThemeProvider({ overrides, defaultColorMode, children }: ThemeProviderProps): ReactNode {
  const [theme, setTheme] = useState<Theme>(() => createTheme(overrides));
  const [colorMode, setColorModeState] = useState<ColorMode>(() => defaultColorMode ?? readStoredMode());
  const [isDark, setIsDark] = useState(() => resolveIsDark(colorMode));

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
  }, [isDark, theme]);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState((prev) => {
      const next = prev === 'light' ? 'dark' : prev === 'dark' ? 'light' : getSystemPreference() ? 'light' : 'dark';
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const applyBranding = useCallback((branding: TenantBranding) => {
    setTheme(createTheme({ ...overrides, branding }));
  }, [overrides]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colorMode, isDark, setColorMode, toggleColorMode, applyBranding }),
    [theme, colorMode, isDark, setColorMode, toggleColorMode, applyBranding],
  );

const GLOBAL_CSS = `
  .maw-btn-hover:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
    box-shadow: var(--maw-shadow-sm);
  }
  .maw-btn-hover:active {
    filter: brightness(0.95);
    transform: scale(0.98);
    box-shadow: none;
  }
  
  .maw-card-hover {
    transition: transform var(--maw-transition-smooth), box-shadow var(--maw-transition-smooth), border-color var(--maw-transition-smooth);
  }
  .maw-card-hover:hover {
    transform: translateY(-2px);
    box-shadow: var(--maw-shadow-md);
    border-color: var(--maw-borderFocus);
  }

  .maw-focus-ring {
    transition: box-shadow var(--maw-transition-fast), border-color var(--maw-transition-fast), background var(--maw-transition-fast);
  }
  .maw-focus-ring:focus, .maw-focus-ring:focus-within {
    box-shadow: 0 0 0 3px var(--maw-brandLight);
    border-color: var(--maw-brand);
    outline: none;
  }

  @keyframes maw-fade-slide-up {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  .maw-animate-in {
    animation: maw-fade-slide-up var(--maw-transition-bounce) forwards;
  }
  
  @keyframes maw-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .maw-fade-in {
    animation: maw-fade-in var(--maw-transition-normal) forwards;
  }

  @keyframes maw-slide-in-right {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  .maw-slide-in-right {
    animation: maw-slide-in-right var(--maw-transition-smooth) forwards;
  }

  .maw-table-row-hover {
    transition: background-color var(--maw-transition-fast);
  }
  .maw-table-row-hover:hover {
    background-color: var(--maw-bgSubtle) !important;
  }
`;

  return (
    <ThemeContext.Provider value={value}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}

export function useColorMode(): Pick<ThemeContextValue, 'colorMode' | 'isDark' | 'setColorMode' | 'toggleColorMode'> {
  const { colorMode, isDark, setColorMode, toggleColorMode } = useTheme();
  return { colorMode, isDark, setColorMode, toggleColorMode };
}

export { type Theme, type ThemeOverrides, type TenantBranding } from '@maw/theme';
