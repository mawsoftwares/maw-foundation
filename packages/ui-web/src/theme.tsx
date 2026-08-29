import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createTheme,
  tokensToCssVars,
  type Theme,
  type ThemeOverrides,
  type TenantBranding,
} from '@mawsoftwares/theme';

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
  /** When set, color mode is controlled by the parent (e.g. BrandProvider). */
  readonly colorMode?: ColorMode;
  readonly onColorModeChange?: (mode: ColorMode) => void;
  readonly children: ReactNode;
}

const GLOBAL_CSS = `
  html, body, #root {
    margin: 0;
    padding: 0;
    min-height: 100%;
    height: 100%;
    background-color: var(--maw-canvas, var(--maw-bgSubtle));
    color: var(--maw-fg);
    font-family: var(--maw-font-family);
    -webkit-font-smoothing: antialiased;
  }

  .maw-auth-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--maw-canvas, var(--maw-bgSubtle));
    color: var(--maw-fg);
  }

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

  @keyframes maw-slide-in-left {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  .maw-slide-in-left {
    animation: maw-slide-in-left var(--maw-transition-smooth) forwards;
  }

  .maw-shell-overflow {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  .maw-shell-overflow > div > div {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
    width: 100%;
  }
  .maw-shell-overflow select {
    width: 100%;
    min-height: 36px;
    box-sizing: border-box;
  }
  .maw-shell-overflow button {
    width: 100%;
    justify-content: flex-start;
  }
  .maw-action-label {
    display: none;
  }
  .maw-shell-overflow .maw-action-label {
    display: block;
    font-size: var(--maw-text-xs);
    font-weight: 600;
    color: var(--maw-fgMuted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .maw-shell-overflow div[style*="width: 1"] {
    display: none !important;
  }

  .maw-table-row-hover {
    transition: background-color var(--maw-transition-fast);
  }
  .maw-table-row-hover:hover {
    background-color: var(--maw-bgSubtle) !important;
  }
`;

export function ThemeProvider({
  overrides,
  defaultColorMode,
  colorMode: colorModeProp,
  onColorModeChange,
  children,
}: ThemeProviderProps): ReactNode {
  const isControlled = colorModeProp !== undefined;
  const [theme, setTheme] = useState<Theme>(() => createTheme(overrides));
  const [internalMode, setInternalMode] = useState<ColorMode>(() => defaultColorMode ?? readStoredMode());
  const colorMode = isControlled ? colorModeProp : internalMode;
  const [isDark, setIsDark] = useState(() => resolveIsDark(colorMode));

  useEffect(() => {
    setTheme(createTheme(overrides));
  }, [overrides]);

  useEffect(() => {
    setIsDark(resolveIsDark(colorMode));
    if (!isControlled && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, colorMode);
    }
  }, [colorMode, isControlled]);

  useEffect(() => {
    if (colorMode !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [colorMode]);

  useLayoutEffect(() => {
    const vars = tokensToCssVars(isDark, theme);
    const root = document.documentElement;
    for (const [prop, val] of Object.entries(vars)) {
      root.style.setProperty(prop, val);
    }
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark, theme]);

  const setColorMode = useCallback((mode: ColorMode) => {
    if (isControlled) {
      onColorModeChange?.(mode);
      return;
    }
    setInternalMode(mode);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, mode);
  }, [isControlled, onColorModeChange]);

  const toggleColorMode = useCallback(() => {
    const next = colorMode === 'light' ? 'dark' : colorMode === 'dark' ? 'light' : getSystemPreference() ? 'light' : 'dark';
    setColorMode(next);
  }, [colorMode, setColorMode]);

  const applyBranding = useCallback((branding: TenantBranding) => {
    setTheme(createTheme({ ...overrides, branding }));
  }, [overrides]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colorMode, isDark, setColorMode, toggleColorMode, applyBranding }),
    [theme, colorMode, isDark, setColorMode, toggleColorMode, applyBranding],
  );

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

export { type Theme, type ThemeOverrides, type TenantBranding } from '@mawsoftwares/theme';
