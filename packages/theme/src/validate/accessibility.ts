import { tokensToCssVars, type Palette, type Theme } from '../index';
import { parsePx } from '../design/analyze';
import { contrastRatio, over, parseColor, suggestForeground, toHex, type Rgba } from './color';
import type { ValidationFinding } from './types';

/** WCAG 2.x thresholds. */
const TEXT_CONTRAST = 4.5;
const LARGE_TEXT_CONTRAST = 3;
const NON_TEXT_CONTRAST = 3;
const MIN_FOCUS_RING_PX = 2;
const MIN_TARGET_PX = 24; // WCAG 2.5.8 (AA)
const RECOMMENDED_TARGET_PX = 44; // WCAG 2.5.5 / platform guidance
const MIN_READABLE_PX = 12;
const MIN_BODY_PX = 14;

/** [foreground role, background role, what it is]. */
const TEXT_PAIRS: readonly (readonly [keyof Palette, keyof Palette, string])[] = [
  ['fg', 'bg', 'Body text on surfaces'],
  ['fg', 'bgSubtle', 'Body text on the page background'],
  ['fg', 'bgMuted', 'Body text on muted surfaces'],
  ['fgMuted', 'bg', 'Secondary text on surfaces'],
  ['fgMuted', 'bgSubtle', 'Secondary text on the page background'],
  ['fgSubtle', 'bg', 'Placeholder / tertiary text'],
  ['brandContrast', 'brand', 'Primary button text'],
  ['brand', 'bg', 'Brand-coloured text and links'],
  ['success', 'successBg', 'Success badge text'],
  ['danger', 'dangerBg', 'Error badge text'],
  ['warning', 'warningBg', 'Warning badge text'],
  ['info', 'infoBg', 'Info badge text'],
];

const label = (key: string): string => key.replace(/([A-Z])/g, ' $1').toLowerCase();

/** Follow `var(--x, fallback)` chains through the generated variables to a literal value. */
export function resolveCssValue(value: string | undefined, vars: Readonly<Record<string, string>>, depth = 0): string | undefined {
  if (value === undefined || depth > 6) return undefined;
  const match = /^var\((--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(value.trim());
  if (match === null) return value.trim();
  const target = vars[match[1] ?? ''];
  return resolveCssValue(target ?? match[2], vars, depth + 1);
}

interface Context {
  readonly findings: ValidationFinding[];
  readonly skipped: string[];
}

function checkContrast(
  ctx: Context, id: string, name: string, fg: Rgba, bg: Rgba, backdrop: Rgba, required: number,
  fix?: { target: 'palette' | 'paletteDark'; key: keyof Palette },
): void {
  const ratio = contrastRatio(fg, bg, backdrop);
  if (ratio >= required) return;
  const severity = ratio < LARGE_TEXT_CONTRAST && required === TEXT_CONTRAST ? 'error' : 'warning';
  const suggestion = fix === undefined ? undefined : suggestForeground(fg, bg, required, backdrop);
  ctx.findings.push({
    id,
    area: 'accessibility',
    severity,
    accessibility: true,
    path: fix === undefined ? undefined : `${fix.target}.${fix.key}`,
    message: `${name}: contrast ${ratio.toFixed(2)}:1, needs ${required}:1.`
      + (required === TEXT_CONTRAST && ratio >= LARGE_TEXT_CONTRAST ? ' Passes only for large text.' : ''),
    ...(fix !== undefined && suggestion !== undefined
      ? { fix: { description: `Set ${fix.key} to ${toHex(suggestion)} (nearest colour that reaches ${required}:1)`, patch: { [fix.target]: { [fix.key]: toHex(suggestion) } } } }
      : {}),
  });
}

/**
 * Accessibility audit of a resolved theme in light and dark mode. Reports only — it never changes a value.
 * Fixes are offered as explicit patches the caller may apply.
 */
export function checkAccessibility(theme: Theme): { findings: readonly ValidationFinding[]; skipped: readonly string[] } {
  const ctx: Context = { findings: [], skipped: [] };

  for (const mode of ['light', 'dark'] as const) {
    const dark = mode === 'dark';
    const palette = dark ? theme.dark : theme.light;
    const vars = tokensToCssVars(dark, theme);
    const target = dark ? 'paletteDark' : 'palette';
    const backdrop = parseColor(palette.bgSubtle) ?? { r: 255, g: 255, b: 255, a: 1 };

    // 1. Text contrast on the palette.
    for (const [fgKey, bgKey, name] of TEXT_PAIRS) {
      const fg = parseColor(palette[fgKey]);
      const bg = parseColor(palette[bgKey]);
      if (fg === undefined || bg === undefined) { ctx.skipped.push(`${mode}: ${name}`); continue; }
      checkContrast(ctx, `a11y.contrast.${mode}.${fgKey}-on-${bgKey}`, `${name} (${mode})`, fg, bg, backdrop, TEXT_CONTRAST, { target, key: fgKey });
    }

    // 2. Component text on component backgrounds, wherever a design states both. Navigation sits on the shell
    //    (often dark and translucent), not on the page, so a transparent nav item is judged against the shell.
    const shell = parseColor(resolveCssValue(vars['--maw-shell-bg'], vars) ?? '');
    const shellBackdrop = shell === undefined ? backdrop : over(shell, backdrop);
    for (const name of Object.keys(vars)) {
      const prefix = /^--maw-comp-(.+)-background$/.exec(name)?.[1];
      if (prefix === undefined) continue;
      const textName = `--maw-comp-${prefix}-text-color`;
      if (vars[textName] === undefined) continue;
      const fg = parseColor(resolveCssValue(vars[textName], vars) ?? '');
      const bg = parseColor(resolveCssValue(vars[name], vars) ?? '');
      if (fg === undefined || bg === undefined) { ctx.skipped.push(`${mode}: components ${prefix}`); continue; }
      checkContrast(ctx, `a11y.contrast.${mode}.component.${prefix}`, `${prefix} text on its background (${mode})`, fg, bg, /^(nav|shell|sidebar|header|topbar)/.test(prefix) ? shellBackdrop : backdrop, TEXT_CONTRAST);
    }

    // 3. Focus visibility: the ring must stand out from every surface it can sit on, and be thick enough to see.
    const ring = parseColor(resolveCssValue(vars['--maw-state-focus-ring'], vars) ?? '');
    if (ring === undefined) ctx.skipped.push(`${mode}: focus ring colour`);
    else {
      for (const surface of ['bg', 'bgSubtle'] as const) {
        const bg = parseColor(palette[surface]);
        if (bg !== undefined) checkContrast(ctx, `a11y.focus.${mode}.ring-on-${surface}`, `Keyboard focus ring on ${label(surface)} (${mode})`, ring, bg, backdrop, NON_TEXT_CONTRAST, { target, key: 'borderFocus' });
      }
    }
    const ringWidth = parsePx(resolveCssValue(vars['--maw-state-focus-ring-width'], vars) ?? '');
    if (ringWidth !== undefined && ringWidth < MIN_FOCUS_RING_PX && !dark) {
      ctx.findings.push({ id: 'a11y.focus.ring-width', area: 'accessibility', severity: 'warning', accessibility: true, message: `Focus ring is ${ringWidth}px wide; ${MIN_FOCUS_RING_PX}px or more is easier to see.` });
    }
    const focusBorder = parseColor(resolveCssValue(vars['--maw-comp-inputs-focus-border-color'], vars) ?? '');
    const inputBg = parseColor(resolveCssValue(vars['--maw-comp-inputs-background'] ?? palette.bg, vars) ?? '');
    if (focusBorder !== undefined && inputBg !== undefined) {
      checkContrast(ctx, `a11y.focus.${mode}.input-border`, `Focused input border (${mode})`, focusBorder, inputBg, backdrop, NON_TEXT_CONTRAST);
    }

    // 4. Disabled controls must still read as present.
    const disFg = parseColor(resolveCssValue(vars['--maw-state-disabled-fg'], vars) ?? '');
    const disBg = parseColor(resolveCssValue(vars['--maw-state-disabled-bg'], vars) ?? '');
    if (disFg !== undefined && disBg !== undefined && contrastRatio(disFg, disBg, backdrop) < 1.5) {
      ctx.findings.push({ id: `a11y.disabled.${mode}.contrast`, area: 'accessibility', severity: 'warning', accessibility: true, message: `Disabled text is almost invisible on its background (${mode}, ${contrastRatio(disFg, disBg, backdrop).toFixed(2)}:1). WCAG exempts disabled controls, but users still need to see them.` });
    }
    const opacity = Number.parseFloat(vars['--maw-state-disabled-opacity'] ?? '');
    if (!dark && Number.isFinite(opacity) && opacity < 0.3) {
      ctx.findings.push({ id: 'a11y.disabled.opacity', area: 'accessibility', severity: 'warning', accessibility: true, message: `Disabled controls render at ${opacity} opacity, which makes them hard to find.` });
    }
  }

  // 5. Readable font sizes.
  const base = theme.typography.size.md;
  if (base < MIN_BODY_PX) {
    ctx.findings.push({ id: 'a11y.font-size.base', area: 'accessibility', severity: 'warning', accessibility: true, path: 'typography.size.md', message: `Base text size is ${base}px; ${MIN_BODY_PX}px or more is recommended.` });
  }
  for (const [step, def] of Object.entries(theme.typography.scale ?? {})) {
    const px = def.size === undefined ? undefined : parsePx(def.size);
    if (px === undefined) continue;
    const isBody = /^body/.test(step);
    if (px < MIN_READABLE_PX || (isBody && px < MIN_BODY_PX)) {
      ctx.findings.push({
        id: `a11y.font-size.${step}`, area: 'accessibility', severity: 'warning', accessibility: true, path: `typography.scale.${step}.size`,
        message: `Type step "${step}" is ${px}px; ${isBody ? MIN_BODY_PX : MIN_READABLE_PX}px or more is recommended for ${isBody ? 'body text' : 'readable text'}.`,
      });
    }
  }

  // 6. Touch targets. Light vars are enough: sizes do not change with colour mode.
  const vars = tokensToCssVars(false, theme);
  const targets: readonly (readonly [string, string, string])[] = [
    ['buttons', '--maw-comp-buttons-medium-height', 'Button'],
    ['inputs', '--maw-comp-inputs-height', 'Input'],
  ];
  for (const [key, varName, name] of targets) {
    const px = parsePx(resolveCssValue(vars[varName], vars) ?? '');
    if (px === undefined) continue;
    if (px < MIN_TARGET_PX) {
      ctx.findings.push({ id: `a11y.target.${key}`, area: 'accessibility', severity: 'error', accessibility: true, message: `${name} height is ${px}px, below the ${MIN_TARGET_PX}px WCAG 2.2 minimum target size.` });
    } else if (px < RECOMMENDED_TARGET_PX) {
      ctx.findings.push({ id: `a11y.target.${key}`, area: 'accessibility', severity: 'warning', accessibility: true, message: `${name} height is ${px}px; ${RECOMMENDED_TARGET_PX}px is recommended for touch targets on mobile.` });
    }
  }

  return { findings: ctx.findings, skipped: ctx.skipped };
}
