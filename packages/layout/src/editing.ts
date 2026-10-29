import { CURRENT_LAYOUT_VERSION, type LayoutOverrides, type LayoutPreset, type StoredLayoutConfig } from './types';

/**
 * Immutable edits to a stored layout config — what Layout Studio does as a user changes settings. UI-agnostic:
 * a different editor (CLI, JSON form) reuses it. Results are not validated here; validate before saving.
 */

export type OverridePath = readonly string[];

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function createLayoutConfig(presetId: string): StoredLayoutConfig {
  return { version: CURRENT_LAYOUT_VERSION, presetId };
}

/** Switching preset starts from that preset's defaults: overrides were made against the previous one. */
export function setLayoutPreset(_config: StoredLayoutConfig | null, presetId: string): StoredLayoutConfig {
  return createLayoutConfig(presetId);
}

function setIn(node: unknown, path: OverridePath, value: unknown): Record<string, unknown> {
  const [head, ...rest] = path;
  if (head === undefined || UNSAFE_KEYS.has(head)) return isRecord(node) ? node : {};
  const base = isRecord(node) ? node : {};
  return { ...base, [head]: rest.length === 0 ? value : setIn(base[head], rest, value) };
}

function removeIn(node: unknown, path: OverridePath): Record<string, unknown> | undefined {
  if (!isRecord(node)) return undefined;
  const [head, ...rest] = path;
  if (head === undefined || !(head in node)) return node;
  const next = { ...node };
  if (rest.length === 0) delete next[head];
  else {
    const child = removeIn(node[head], rest);
    if (child === undefined || Object.keys(child).length === 0) delete next[head];
    else next[head] = child;
  }
  return next;
}

/** Set one override, e.g. `['sidebar', 'width']` → `'lg'`. */
export function setLayoutOverride(config: StoredLayoutConfig, path: OverridePath, value: unknown): StoredLayoutConfig {
  return { ...config, overrides: setIn(config.overrides, path, value) as LayoutOverrides };
}

/** Drop one override (back to the preset's value); empty parents are pruned, and `overrides` vanishes when empty. */
export function clearLayoutOverride(config: StoredLayoutConfig, path: OverridePath): StoredLayoutConfig {
  const overrides = removeIn(config.overrides, path);
  const { overrides: _old, ...rest } = config;
  return overrides === undefined || Object.keys(overrides).length === 0 ? rest : { ...rest, overrides: overrides as LayoutOverrides };
}

/** Keep the preset, discard every override. */
export function restorePresetDefaults(config: StoredLayoutConfig): StoredLayoutConfig {
  return createLayoutConfig(config.presetId);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])]));
  }
  return value;
}

/** Order-insensitive equality, for "has the draft changed?". */
export function layoutConfigsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

/** Number of leaf overrides — shown as "3 customisations". */
export function countLayoutOverrides(config: StoredLayoutConfig): number {
  const count = (v: unknown): number => (Array.isArray(v) ? 1 : isRecord(v) ? Object.values(v).reduce<number>((n, c) => n + count(c), 0) : 1);
  return config.overrides === undefined ? 0 : count(config.overrides);
}

/** Read a value by path from any settings-shaped object. */
export function getAtPath(node: unknown, path: OverridePath): unknown {
  return path.reduce<unknown>((n, key) => (isRecord(n) ? n[key] : undefined), node);
}

/**
 * Change one setting the way an editor wants it: if the new value equals the preset's own default the override is
 * removed (so "customisations" only lists real differences), otherwise it is set.
 */
export function setLayoutSetting(config: StoredLayoutConfig, preset: LayoutPreset, path: OverridePath, value: unknown): StoredLayoutConfig {
  return layoutConfigsEqual(getAtPath(preset.settings, path), value) ? clearLayoutOverride(config, path) : setLayoutOverride(config, path, value);
}
