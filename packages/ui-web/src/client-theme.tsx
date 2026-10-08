import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ThemeOverrides, ThemeRegistry } from '@mawsoftwares/theme';
import { ThemeProvider, type ColorMode } from './theme';

export interface ClientThemeContextValue {
  /** The active client theme id. */
  readonly themeId: string;
  /** Every id the registry can resolve. */
  readonly themeIds: readonly string[];
  /** Switch client theme at runtime; unknown ids are ignored. */
  setThemeId(id: string): void;
}

const ClientThemeContext = createContext<ClientThemeContextValue | null>(null);

function readStored(key: string | undefined): string | null {
  if (key === undefined) return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStored(key: string | undefined, id: string): void {
  if (key === undefined) return;
  try { localStorage.setItem(key, id); } catch { /* storage unavailable: the choice just won't persist */ }
}

export interface ClientThemeProviderProps {
  readonly registry: ThemeRegistry;
  /** Controlled theme id. Omit to let `setThemeId` (and `defaultThemeId`) drive it. */
  readonly themeId?: string;
  readonly defaultThemeId?: string;
  /** `localStorage` key to remember the choice across reloads. Off when omitted. */
  readonly storageKey?: string;
  readonly colorMode?: ColorMode;
  readonly children: ReactNode;
}

/**
 * `<ClientThemeProvider registry={themes} themeId="client-a">` — the same application, a different client's design.
 * Components, business logic and routes are untouched; only the resolved theme changes.
 */
export function ClientThemeProvider({
  registry, themeId: controlled, defaultThemeId, storageKey, colorMode, children,
}: ClientThemeProviderProps): ReactNode {
  const [chosen, setChosen] = useState<string | undefined>(() => {
    const stored = readStored(storageKey);
    if (stored !== null && registry.has(stored)) return stored;
    return defaultThemeId ?? registry.ids()[0];
  });
  const themeId = controlled ?? chosen ?? '';

  const overrides = useMemo<ThemeOverrides | undefined>(
    () => (registry.has(themeId) ? registry.resolveOverrides(themeId) : undefined),
    [registry, themeId],
  );

  const setThemeId = useCallback((id: string) => {
    if (!registry.has(id)) return;
    setChosen(id);
    writeStored(storageKey, id);
  }, [registry, storageKey]);

  const value = useMemo<ClientThemeContextValue>(
    () => ({ themeId, themeIds: registry.ids(), setThemeId }),
    [themeId, registry, setThemeId],
  );

  return (
    <ClientThemeContext.Provider value={value}>
      <ThemeProvider overrides={overrides} {...(colorMode === undefined ? {} : { colorMode })}>{children}</ThemeProvider>
    </ClientThemeContext.Provider>
  );
}

export function useClientTheme(): ClientThemeContextValue {
  const ctx = useContext(ClientThemeContext);
  if (ctx === null) throw new Error('useClientTheme must be used within <ClientThemeProvider>');
  return ctx;
}
