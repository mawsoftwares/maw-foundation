import { isLoadableFont, isMappedComponentProp, resolveComponentFamily } from '../index';
import { analyzeDesign } from '../design/analyze';
import { ROLE_TO_PALETTE } from '../design/generator';
import type { NormalizedDesign } from '../design/types';
import type { Theme } from '../index';
import { parseColor } from './color';
import type { ValidationArea, ValidationFinding } from './types';

/** Which report area a themed component family belongs to. */
const FAMILY_AREA: Readonly<Record<string, ValidationArea>> = {
  buttons: 'buttons',
  inputs: 'forms', forms: 'forms', checkboxes: 'forms', radios: 'forms', toggles: 'forms',
  cards: 'cards',
  tabs: 'navigation', breadcrumbs: 'navigation', menus: 'navigation', pagination: 'navigation',
};

export function areaForComponent(name: string): ValidationArea {
  if (/^(nav|sidebar|shell|topbar|header)/.test(name)) return 'navigation';
  const family = resolveComponentFamily(name);
  return (family === undefined ? undefined : FAMILY_AREA[family]) ?? 'components';
}

const sameColor = (a: string, b: string): boolean => {
  const [x, y] = [parseColor(a), parseColor(b)];
  if (x === undefined || y === undefined) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return Math.abs(x.r - y.r) <= 1 && Math.abs(x.g - y.g) <= 1 && Math.abs(x.b - y.b) <= 1 && Math.abs(x.a - y.a) < 0.01;
};

/**
 * Where the generated theme departs from, or cannot express, what the design says. Compares the normalized
 * design with the resolved theme; no rendering involved (see `compareRendered` for that).
 */
export function checkFidelity(design: NormalizedDesign, theme: Theme): readonly ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const add = (f: ValidationFinding): void => { findings.push(f); };

  // Colours: required roles, and the theme actually carrying what the design said.
  const { analysis } = analyzeDesign(design);
  for (const role of analysis.coverage.missing) {
    add({ id: `colors.missing.${role}`, area: 'colors', severity: 'warning', path: `colors.light.${role}`, message: `The design does not provide "${role}"; the theme falls back to its built-in value.` });
  }
  for (const mode of ['light', 'dark'] as const) {
    const roles = mode === 'light' ? design.colors.light : (design.colors.dark ?? {});
    const palette = mode === 'light' ? theme.light : theme.dark;
    for (const [role, token] of Object.entries(roles)) {
      const key = ROLE_TO_PALETTE[role];
      if (key === undefined) continue;
      if (!sameColor(token.value, palette[key])) {
        add({ id: `colors.differs.${mode}.${role}`, area: 'colors', severity: 'warning', path: `${mode}.${role}`, message: `${role} (${mode}) is ${token.value} in the design but ${palette[key]} in the theme.` });
      }
    }
  }

  // Typography: fonts that will not load, steps without a size.
  const fontFamily = design.typography.fontFamily?.value;
  const fontAssets = design.assets.fonts ?? [];
  if (fontFamily !== undefined && !isLoadableFont(fontFamily)) {
    const first = fontFamily.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? fontFamily;
    if (!fontAssets.some((f) => f.family === first && f.url !== undefined)) {
      add({ id: 'typography.font-unavailable', area: 'typography', severity: 'warning', path: 'typography.fontFamily', message: `Font "${first}" is not a system font and no font file was provided; text will fall back to the default font.` });
    }
  }
  for (const [step, def] of Object.entries(design.typography.scale)) {
    if (def.size === undefined) add({ id: `typography.no-size.${step}`, area: 'typography', severity: 'info', path: `typography.scale.${step}`, message: `Type step "${step}" has no size; the theme default is used.` });
  }
  if (Object.keys(design.typography.scale).length > 0 && !Object.keys(design.typography.scale).some((s) => /^body/.test(s))) {
    add({ id: 'typography.no-body', area: 'typography', severity: 'info', message: 'The type scale has no body step; body text uses the theme default.' });
  }

  // Spacing: a grid-less scale is worth knowing about.
  if (analysis.spacingSystem.kind === 'mixed') {
    add({ id: 'spacing.no-grid', area: 'spacing', severity: 'warning', message: `Spacing values do not follow a single grid (${Math.round((analysis.spacingSystem.fit ?? 0) * 100)}% fit a 4px/8px grid). They are used as given.` });
  }

  // Shadows kept verbatim could not be broken into layers.
  for (const [name, token] of Object.entries(design.shadows)) {
    if (typeof token.value === 'string' && token.value !== 'none') {
      add({ id: `shadows.verbatim.${name}`, area: 'shadows', severity: 'info', path: `shadows.${name}`, message: `Shadow "${name}" uses units that were kept as written (not analysed).` });
    }
  }

  // Components: names and properties the theme cannot apply.
  for (const [name, props] of Object.entries(design.components)) {
    const area = areaForComponent(name);
    if (resolveComponentFamily(name) === undefined && !/^(nav|sidebar|shell|topbar|header)/.test(name)) {
      add({ id: `components.unmapped.${name}`, area, severity: 'warning', path: `components.${name}`, message: `Component "${name}" has no themed counterpart; its tokens are exported but no built-in component uses them.` });
      continue;
    }
    for (const prop of Object.keys(props)) {
      if (!isMappedComponentProp(prop)) {
        add({ id: `components.prop.${name}.${prop}`, area, severity: 'info', path: `components.${name}.${prop}`, message: `"${name}.${prop}" is exported as a token but not applied by the built-in components.` });
      }
    }
  }

  // Responsive: a desktop value with no mobile value means mobile reuses it.
  for (const [name, map] of Object.entries(design.spacing.semantic ?? {})) {
    if (map.desktop !== undefined && map.mobile === undefined) {
      add({ id: `responsive.no-mobile.${name}`, area: 'responsive', severity: 'info', path: `spacing.semantic.${name}`, message: `"${name}" spacing is only given for desktop; mobile will reuse it.` });
    }
  }
  return findings;
}
