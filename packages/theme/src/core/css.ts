import { tokensToCssVars, type Theme } from '../index';
import { responsiveCss, responsiveVarNames } from './responsive';

function declarations(vars: Readonly<Record<string, string>>, skip: ReadonlySet<string>, indent: string): string {
  return Object.entries(vars)
    .filter(([name]) => !skip.has(name))
    .map(([name, value]) => `${indent}${name}: ${value};`)
    .join('\n');
}

export interface ThemeCssOptions {
  /** Selector for light-mode variables. */
  readonly lightSelector?: string;
  /** Selector for dark-mode variables. */
  readonly darkSelector?: string;
}

/**
 * Full stylesheet for a theme: light and dark custom properties plus responsive overrides. This is what
 * the `theme.css` export and any non-React host (plain HTML, server-rendered pages) should use.
 */
export function themeToCssText(theme: Theme, options: ThemeCssOptions = {}): string {
  const lightSelector = options.lightSelector ?? ':root';
  const darkSelector = options.darkSelector ?? ":root[data-theme='dark']";
  // Responsive tokens are emitted separately (with media queries); don't also emit their base value here.
  const skip = new Set(responsiveVarNames(theme.responsive));
  const parts = [
    `${lightSelector} {\n${declarations(tokensToCssVars(false, theme), skip, '  ')}\n}`,
    `${darkSelector} {\n${declarations(tokensToCssVars(true, theme), skip, '  ')}\n}`,
  ];
  const responsive = responsiveCss(theme.responsive, theme.breakpoints, lightSelector);
  if (responsive !== '') parts.push(responsive);
  return `${parts.join('\n\n')}\n`;
}
