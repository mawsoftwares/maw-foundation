/**
 * Dependency-free i18n. `t(key, params)` looks a key up in the active locale and
 * interpolates `{name}` placeholders. Products register their own catalogs; nothing
 * restaurant- or product-specific ships here (that was a coupling point in the source
 * platform — defaults are now product config, not baked in).
 */
export type Messages = Readonly<Record<string, string>>;

const catalogs = new Map<string, Messages>();
let activeLocale = 'en';

export function registerLocale(locale: string, messages: Messages): void {
  catalogs.set(locale, { ...(catalogs.get(locale) ?? {}), ...messages });
}

export function setLocale(locale: string): void {
  activeLocale = locale;
}

export function getLocale(): string {
  return activeLocale;
}

export function t(key: string, params?: Readonly<Record<string, string | number>>): string {
  const template = catalogs.get(activeLocale)?.[key] ?? key;
  if (params === undefined) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  );
}
