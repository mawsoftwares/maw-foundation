import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as i18n from '@mawsoftwares/sdk/i18n';

interface I18nContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Readonly<Record<string, string | number>>) => string;
  tn: (namespace: string) => (key: string, params?: Readonly<Record<string, string | number>>) => string;
  availableLocales: string[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  readonly defaultLocale?: string;
  readonly children: ReactNode;
}

export function I18nProvider({ defaultLocale = 'en', children }: I18nProviderProps): ReactNode {
  const [locale, setLocaleState] = useState(() => {
    i18n.setLocale(defaultLocale);
    return defaultLocale;
  });

  useEffect(() => {
    return i18n.onLocaleChange((newLocale) => {
      setLocaleState(newLocale);
    });
  }, []);

  const setLocale = useCallback((newLocale: string) => {
    i18n.setLocale(newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Readonly<Record<string, string | number>>) => i18n.t(key, params),
    [locale],
  );

  const tn = useCallback(
    (namespace: string) => i18n.createNamespacedT(namespace),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      tn,
      availableLocales: i18n.getAvailableLocales(),
    }),
    [locale, setLocale, t, tn],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx === null) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}

export function useT(): I18nContextValue['t'] {
  return useI18n().t;
}

export function useNamespacedT(namespace: string): (key: string, params?: Readonly<Record<string, string | number>>) => string {
  return useI18n().tn(namespace);
}
