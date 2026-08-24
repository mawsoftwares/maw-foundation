import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TranslationDictionary = Record<string, Record<string, string>>;

interface I18nContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: readonly string[];
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ---------------------------------------------------------------------------
// I18nProvider (same contract as ui-web/i18n.tsx)
// ---------------------------------------------------------------------------

export interface I18nProviderProps {
  readonly defaultLocale?: string;
  readonly translations: TranslationDictionary;
  readonly children: ReactNode;
}

export function I18nProvider({ defaultLocale = 'en', translations, children }: I18nProviderProps): ReactNode {
  const [locale, setLocale] = useState(defaultLocale);

  const availableLocales = useMemo(() => Object.keys(translations), [translations]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const dict = translations[locale];
      if (dict && key in dict) return dict[key]!;
      const enDict = translations.en;
      if (enDict && key in enDict) return enDict[key]!;
      return fallback ?? key;
    },
    [locale, translations],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, availableLocales, t }),
    [locale, availableLocales, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx === null) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}

export function useT(): (key: string, fallback?: string) => string {
  return useI18n().t;
}
