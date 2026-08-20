/**
 * Dependency-free i18n with namespace support.
 *
 * Namespaces let modules register their own translations without collisions:
 *   registerLocale('en', { 'common.save': 'Save', 'billing.invoice': 'Invoice' })
 *   registerNamespace('en', 'orders', { title: 'Orders', empty: 'No orders yet' })
 *   t('common.save')     → 'Save'
 *   t('orders.title')    → 'Orders'
 *   t('orders.empty')    → 'No orders yet'
 *
 * Interpolation: t('greeting', { name: 'Raj' }) with template 'Hello {name}' → 'Hello Raj'
 * Plurals: t('items', { count: 3 }) with 'item|items' → 'items', count=1 → 'item'
 */

export type Messages = Readonly<Record<string, string>>;
export type LocaleChangeListener = (locale: string) => void;

const catalogs = new Map<string, Messages>();
const listeners = new Set<LocaleChangeListener>();
let activeLocale = 'en';
let fallbackLocale = 'en';

export function registerLocale(locale: string, messages: Messages): void {
  catalogs.set(locale, { ...(catalogs.get(locale) ?? {}), ...messages });
}

export function registerNamespace(locale: string, namespace: string, messages: Messages): void {
  const prefixed: Record<string, string> = {};
  for (const [key, value] of Object.entries(messages)) {
    prefixed[`${namespace}.${key}`] = value;
  }
  registerLocale(locale, prefixed);
}

export function setLocale(locale: string): void {
  if (locale === activeLocale) return;
  activeLocale = locale;
  for (const fn of listeners) fn(locale);
}

export function getLocale(): string {
  return activeLocale;
}

export function setFallbackLocale(locale: string): void {
  fallbackLocale = locale;
}

export function getFallbackLocale(): string {
  return fallbackLocale;
}

export function getAvailableLocales(): string[] {
  return Array.from(catalogs.keys());
}

export function hasKey(key: string, locale?: string): boolean {
  const catalog = catalogs.get(locale ?? activeLocale);
  return catalog !== undefined && key in catalog;
}

export function onLocaleChange(listener: LocaleChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function resolve(key: string): string {
  const active = catalogs.get(activeLocale);
  if (active !== undefined && key in active) return active[key]!;
  if (fallbackLocale !== activeLocale) {
    const fb = catalogs.get(fallbackLocale);
    if (fb !== undefined && key in fb) return fb[key]!;
  }
  return key;
}

function handlePlural(template: string, count: number): string {
  const parts = template.split('|');
  if (parts.length < 2) return template;
  return count === 1 ? parts[0]! : parts[1]!;
}

export function t(key: string, params?: Readonly<Record<string, string | number>>): string {
  let template = resolve(key);
  if (params !== undefined && 'count' in params) {
    template = handlePlural(template, Number(params.count));
  }
  if (params === undefined) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  );
}

export function createNamespacedT(namespace: string): (key: string, params?: Readonly<Record<string, string | number>>) => string {
  return (key, params) => t(`${namespace}.${key}`, params);
}
