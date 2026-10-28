import type { LayoutIssue, LayoutOverrides, LayoutResult, LayoutSettings, StoredLayoutConfig } from './types';

/**
 * Runtime validation for untrusted layout JSON (request bodies, database rows). Strict: unknown keys are
 * rejected, enum values are closed sets, and component ids must come from the approved list — configuration
 * can only select from what the registry offers, never introduce new behaviour.
 */

type Field =
  | { readonly kind: 'boolean' }
  | { readonly kind: 'enum'; readonly values: readonly string[] }
  | { readonly kind: 'components' }
  | { readonly kind: 'object'; readonly fields: Readonly<Record<string, Field>> };

const bool: Field = { kind: 'boolean' };
const oneOf = (...values: string[]): Field => ({ kind: 'enum', values });
const obj = (fields: Record<string, Field>): Field => ({ kind: 'object', fields });
const SIZES = ['sm', 'md', 'lg'];
const BREAKPOINTS = ['sm', 'md', 'lg', 'xl'];

const SETTINGS_SHAPE = obj({
  density: oneOf('compact', 'comfortable', 'spacious'),
  sidebar: obj({
    enabled: bool,
    position: oneOf('left', 'right'),
    variant: oneOf('docked', 'floating', 'rail'),
    width: oneOf(...SIZES),
    collapsible: bool,
    defaultCollapsed: bool,
    labels: oneOf('beside', 'below'),
    expandOnHover: bool,
    top: { kind: 'components' },
    bottom: { kind: 'components' },
  }),
  header: obj({
    enabled: bool,
    variant: oneOf('default', 'minimal', 'prominent'),
    sticky: bool,
    start: { kind: 'components' },
    end: { kind: 'components' },
  }),
  rightPanel: obj({ enabled: bool, width: oneOf(...SIZES), collapsible: bool, defaultOpen: bool }),
  footer: obj({ enabled: bool }),
  content: obj({ width: oneOf('contained', 'full') }),
  shape: obj({
    frame: oneOf('full-bleed', 'inset'),
    corners: oneOf('sharp', 'soft', 'round'),
    nav: oneOf('rounded', 'pill'),
    indicator: oneOf('fill', 'bar', 'dot'),
  }),
  motion: obj({
    sidebar: oneOf('none', 'smooth', 'spring'),
    items: oneOf('none', 'slide', 'lift'),
    page: oneOf('none', 'fade', 'rise'),
  }),
  responsive: obj({
    sidebarCollapseBelow: oneOf(...BREAKPOINTS),
    rightPanelHideBelow: oneOf(...BREAKPOINTS),
    mobileNavigation: oneOf('drawer', 'bottom-bar'),
  }),
});

const COMPONENT_ID = /^[a-z][a-z0-9-]{0,63}$/;
export const MAX_COMPONENTS_PER_SLOT = 16;
export const MAX_PRESET_ID_LENGTH = 64;
export const PRESET_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function check(value: unknown, field: Field, path: string, partial: boolean, components: ReadonlySet<string>, out: LayoutIssue[]): void {
  switch (field.kind) {
    case 'boolean':
      if (typeof value !== 'boolean') out.push({ path, message: 'Expected true or false.' });
      return;
    case 'enum':
      if (typeof value !== 'string' || !field.values.includes(value)) {
        out.push({ path, message: `Expected one of: ${field.values.join(', ')}.` });
      }
      return;
    case 'components': {
      if (!Array.isArray(value)) return void out.push({ path, message: 'Expected a list of component ids.' });
      if (value.length > MAX_COMPONENTS_PER_SLOT) out.push({ path, message: `At most ${MAX_COMPONENTS_PER_SLOT} components.` });
      const seen = new Set<string>();
      value.forEach((id: unknown, i) => {
        const at = `${path}[${i}]`;
        if (typeof id !== 'string' || !COMPONENT_ID.test(id)) return void out.push({ path: at, message: 'Invalid component id.' });
        if (!components.has(id)) out.push({ path: at, message: `Component "${id}" is not in the approved registry.` });
        if (seen.has(id)) out.push({ path: at, message: `Duplicate component "${id}".` });
        seen.add(id);
      });
      return;
    }
    case 'object': {
      if (!isRecord(value)) return void out.push({ path, message: 'Expected an object.' });
      for (const key of Object.keys(value)) {
        if (!(key in field.fields)) out.push({ path: join(path, key), message: 'Unknown setting.' });
      }
      for (const [key, child] of Object.entries(field.fields)) {
        const v = value[key];
        if (v === undefined) {
          if (!partial) out.push({ path: join(path, key), message: 'Required.' });
          continue;
        }
        check(v, child, join(path, key), partial, components, out);
      }
    }
  }
}

const join = (path: string, key: string): string => (path === '' ? key : `${path}.${key}`);

/** Validate a complete settings object (preset defaults, or the merged result). */
export function validateLayoutSettings(input: unknown, components: ReadonlySet<string>): LayoutResult<LayoutSettings> {
  const issues: LayoutIssue[] = [];
  check(input, SETTINGS_SHAPE, '', false, components, issues);
  return issues.length === 0 ? { ok: true, value: input as LayoutSettings } : { ok: false, issues };
}

/** Validate a partial settings object (what a project overrides). */
export function validateLayoutOverrides(input: unknown, components: ReadonlySet<string>, basePath = 'overrides'): LayoutResult<LayoutOverrides> {
  const issues: LayoutIssue[] = [];
  check(input, SETTINGS_SHAPE, basePath, true, components, issues);
  return issues.length === 0 ? { ok: true, value: input as LayoutOverrides } : { ok: false, issues };
}

/** Validate the stored envelope `{ version, presetId, overrides? }` (version is not range-checked here — see migrate). */
export function validateStoredLayoutConfig(input: unknown, components: ReadonlySet<string>): LayoutResult<StoredLayoutConfig> {
  if (!isRecord(input)) return { ok: false, issues: [{ path: '', message: 'Expected an object.' }] };
  const issues: LayoutIssue[] = [];
  for (const key of Object.keys(input)) {
    if (key !== 'version' && key !== 'presetId' && key !== 'overrides') issues.push({ path: key, message: 'Unknown setting.' });
  }
  if (typeof input['version'] !== 'number' || !Number.isInteger(input['version']) || input['version'] < 1) {
    issues.push({ path: 'version', message: 'Expected a positive integer.' });
  }
  const id = input['presetId'];
  if (typeof id !== 'string' || id.length > MAX_PRESET_ID_LENGTH || !PRESET_ID_PATTERN.test(id)) {
    issues.push({ path: 'presetId', message: 'Invalid preset id.' });
  }
  if (input['overrides'] !== undefined) {
    const r = validateLayoutOverrides(input['overrides'], components);
    if (!r.ok) issues.push(...r.issues);
  }
  return issues.length === 0 ? { ok: true, value: input as unknown as StoredLayoutConfig } : { ok: false, issues };
}

/** Deep-merge overrides onto base. Objects merge key by key; arrays and scalars replace. Inputs are not mutated. */
export function mergeLayoutSettings(base: LayoutSettings, overrides: LayoutOverrides | undefined): LayoutSettings {
  return overrides === undefined ? base : (merge(base, overrides) as LayoutSettings);
}

function merge(base: unknown, over: unknown): unknown {
  if (!isRecord(base) || !isRecord(over)) return over === undefined ? base : over;
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(over)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    result[key] = value === undefined ? result[key] : merge(result[key], value);
  }
  return result;
}
