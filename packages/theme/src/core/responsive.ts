/**
 * Responsive tokens. A token is either a plain value or a per-device map; `desktop` is the base and
 * `tablet` / `mobile` are overrides — one theme, not one theme per device.
 *
 *   mobile  : width <  breakpoints.md
 *   tablet  : width <  breakpoints.lg
 *   desktop : otherwise
 */
export type DeviceClass = 'desktop' | 'tablet' | 'mobile';

export interface ResponsiveMap<T> {
  readonly desktop?: T;
  readonly tablet?: T;
  readonly mobile?: T;
}

export type ResponsiveValue<T = string> = T | ResponsiveMap<T>;

/** Keyed by CSS custom-property name without the `--maw-` prefix, e.g. `space-page`. */
export type ResponsiveTokens = Readonly<Record<string, ResponsiveValue<string>>>;

export function isResponsiveMap<T>(value: ResponsiveValue<T>): value is ResponsiveMap<T> {
  return typeof value === 'object' && value !== null;
}

/** The value for a device, falling back toward the base (desktop) so partial maps stay usable. */
export function resolveResponsive<T>(value: ResponsiveValue<T>, device: DeviceClass): T | undefined {
  if (!isResponsiveMap(value)) return value;
  if (device === 'mobile') return value.mobile ?? value.tablet ?? value.desktop;
  if (device === 'tablet') return value.tablet ?? value.desktop;
  return value.desktop ?? value.tablet ?? value.mobile;
}

export function deviceForWidth(width: number, breakpoints: { readonly md: number; readonly lg: number }): DeviceClass {
  if (width < breakpoints.md) return 'mobile';
  if (width < breakpoints.lg) return 'tablet';
  return 'desktop';
}

/** The base (desktop) value of every responsive token, as CSS custom properties. */
export function responsiveBaseVars(tokens: ResponsiveTokens | undefined): Record<string, string> {
  const vars: Record<string, string> = {};
  if (tokens === undefined) return vars;
  for (const [key, value] of Object.entries(tokens)) {
    const base = resolveResponsive(value, 'desktop');
    if (base !== undefined) vars[`--maw-${key}`] = base;
  }
  return vars;
}

/** Names of the CSS variables owned by responsive tokens (so callers can avoid pinning them inline). */
export function responsiveVarNames(tokens: ResponsiveTokens | undefined): readonly string[] {
  return tokens === undefined ? [] : Object.keys(tokens).map((key) => `--maw-${key}`);
}

function block(selector: string, vars: Readonly<Record<string, string>>): string {
  const body = Object.entries(vars).map(([k, v]) => `${k}:${v};`).join('');
  return body === '' ? '' : `${selector}{${body}}`;
}

/**
 * Stylesheet text for responsive tokens: base values on `selector`, then tablet and mobile overrides in
 * media queries (mobile last so it wins). Inline custom properties would beat these rules, so callers must
 * not also set the same variables inline — see `responsiveVarNames`.
 */
export function responsiveCss(
  tokens: ResponsiveTokens | undefined,
  breakpoints: { readonly md: number; readonly lg: number },
  selector = ':root',
): string {
  if (tokens === undefined) return '';
  const tablet: Record<string, string> = {};
  const mobile: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (!isResponsiveMap(value)) continue;
    if (value.tablet !== undefined) tablet[`--maw-${key}`] = value.tablet;
    if (value.mobile !== undefined) {
      mobile[`--maw-${key}`] = value.mobile;
      // A mobile-only override must not leak into tablet: keep tablet on the base value.
    }
  }
  const base = block(selector, responsiveBaseVars(tokens));
  const tabletCss = block(selector, tablet);
  const mobileCss = block(selector, mobile);
  return [
    base,
    tabletCss === '' ? '' : `@media (max-width:${breakpoints.lg - 1}px){${tabletCss}}`,
    mobileCss === '' ? '' : `@media (max-width:${breakpoints.md - 1}px){${mobileCss}}`,
  ].filter((part) => part !== '').join('\n');
}
