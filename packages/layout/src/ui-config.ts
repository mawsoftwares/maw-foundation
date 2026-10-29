import { CURRENT_LAYOUT_VERSION } from './types';
import { migrateLayoutConfig, type LayoutMigration } from './migrate';
import { defaultLayoutRegistry } from './default-registry';
import type { LayoutRegistry } from './registry';
import { resolveLayout } from './resolve';
import { createLayoutConfig } from './editing';
import type { LayoutIssue, LayoutResult, ResolvedLayout, StoredLayoutConfig } from './types';
import { validateStoredLayoutConfig } from './validate';

/**
 * A project's whole UI selection: which layout, and which theme choices. Theme choices are NAMES from the Theme
 * Engine's registry and closed presets, plus up to three optional hex colours the project chose itself (applied by
 * the host on top of the theme) — so the two engines stay independent.
 */

export const CURRENT_PROJECT_UI_VERSION = 1;

export const COLOR_MODES = ['light', 'dark', 'system'] as const;
export const TYPOGRAPHY_PRESETS = ['compact', 'default', 'comfortable'] as const;
export const SPACING_PRESETS = ['compact', 'default', 'spacious'] as const;

/** Colours a project picks for itself; each is `#rrggbb`. Omitted = the chosen theme's own colour. */
export interface ThemeColors {
  readonly brand?: string;
  readonly sidebar?: string;
  /** The page background behind the content (light mode). */
  readonly page?: string;
}

export const THEME_COLOR_KEYS = ['brand', 'sidebar', 'page'] as const;
const HEX_6 = /^#[0-9a-fA-F]{6}$/;

export interface ThemeSelection {
  /** A theme id from the app's theme registry; `null` = the app's built-in/tenant theme, untouched. */
  readonly themeId: string | null;
  readonly colorMode: (typeof COLOR_MODES)[number];
  readonly typography: (typeof TYPOGRAPHY_PRESETS)[number];
  readonly spacing: (typeof SPACING_PRESETS)[number];
  readonly colors?: ThemeColors;
}

export const DEFAULT_THEME_SELECTION: ThemeSelection = { themeId: null, colorMode: 'system', typography: 'default', spacing: 'default' };

export interface ProjectUiConfig {
  readonly version: number;
  readonly layout: StoredLayoutConfig;
  readonly theme: ThemeSelection;
}

const THEME_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function createDefaultProjectUi(presetId = defaultLayoutRegistry.fallbackPresetId): ProjectUiConfig {
  return { version: CURRENT_PROJECT_UI_VERSION, layout: createLayoutConfig(presetId), theme: DEFAULT_THEME_SELECTION };
}

/** `knownThemeIds`, when given, restricts `themeId` to themes this app actually has. */
export function validateThemeSelection(input: unknown, knownThemeIds?: ReadonlySet<string>, path = 'theme'): LayoutResult<ThemeSelection> {
  if (!isRecord(input)) return { ok: false, issues: [{ path, message: 'Expected an object.' }] };
  const issues: LayoutIssue[] = [];
  for (const key of Object.keys(input)) {
    if (!['themeId', 'colorMode', 'typography', 'spacing', 'colors'].includes(key)) issues.push({ path: `${path}.${key}`, message: 'Unknown setting.' });
  }
  const { themeId, colorMode, typography, spacing } = input;
  if (themeId !== null) {
    if (typeof themeId !== 'string' || !THEME_ID.test(themeId)) issues.push({ path: `${path}.themeId`, message: 'Invalid theme id.' });
    else if (knownThemeIds !== undefined && !knownThemeIds.has(themeId)) issues.push({ path: `${path}.themeId`, message: `Theme "${themeId}" is not available.` });
  }
  const oneOf = (v: unknown, values: readonly string[], key: string): void => {
    if (typeof v !== 'string' || !values.includes(v)) issues.push({ path: `${path}.${key}`, message: `Expected one of: ${values.join(', ')}.` });
  };
  oneOf(colorMode, COLOR_MODES, 'colorMode');
  oneOf(typography, TYPOGRAPHY_PRESETS, 'typography');
  oneOf(spacing, SPACING_PRESETS, 'spacing');
  const { colors } = input;
  if (colors !== undefined) {
    if (!isRecord(colors)) issues.push({ path: `${path}.colors`, message: 'Expected an object.' });
    else {
      for (const [key, v] of Object.entries(colors)) {
        if (!(THEME_COLOR_KEYS as readonly string[]).includes(key)) issues.push({ path: `${path}.colors.${key}`, message: 'Unknown colour.' });
        else if (typeof v !== 'string' || !HEX_6.test(v)) issues.push({ path: `${path}.colors.${key}`, message: 'Expected a hex colour like #3366ff.' });
      }
    }
  }
  return issues.length === 0 ? { ok: true, value: input as unknown as ThemeSelection } : { ok: false, issues };
}

export function validateProjectUiConfig(
  input: unknown,
  components: ReadonlySet<string>,
  knownThemeIds?: ReadonlySet<string>,
): LayoutResult<ProjectUiConfig> {
  if (!isRecord(input)) return { ok: false, issues: [{ path: '', message: 'Expected an object.' }] };
  const issues: LayoutIssue[] = [];
  for (const key of Object.keys(input)) {
    if (!['version', 'layout', 'theme'].includes(key)) issues.push({ path: key, message: 'Unknown setting.' });
  }
  if (typeof input['version'] !== 'number' || !Number.isInteger(input['version']) || input['version'] < 1) {
    issues.push({ path: 'version', message: 'Expected a positive integer.' });
  }
  const layout = validateStoredLayoutConfig(input['layout'], components);
  if (!layout.ok) issues.push(...layout.issues.map((i) => ({ path: `layout${i.path === '' ? '' : `.${i.path}`}`, message: i.message })));
  const theme = validateThemeSelection(input['theme'], knownThemeIds);
  if (!theme.ok) issues.push(...theme.issues);
  return issues.length === 0 ? { ok: true, value: input as unknown as ProjectUiConfig } : { ok: false, issues };
}

export interface ResolvedProjectUi {
  readonly layout: ResolvedLayout;
  readonly theme: ThemeSelection;
  readonly source: 'default' | 'config' | 'fallback';
  readonly issues: readonly LayoutIssue[];
}

/**
 * Whatever is stored → something renderable. The layout and the theme selection degrade independently: a bad theme
 * id never discards a good layout, and vice versa. Never throws.
 */
export function resolveProjectUi(
  stored: unknown,
  registry: LayoutRegistry = defaultLayoutRegistry,
  knownThemeIds?: ReadonlySet<string>,
): ResolvedProjectUi {
  if (stored === null || stored === undefined) {
    return { layout: resolveLayout(null, registry), theme: DEFAULT_THEME_SELECTION, source: 'default', issues: [] };
  }
  const migrated = migrateLayoutConfig(stored, { currentVersion: CURRENT_PROJECT_UI_VERSION });
  if (!migrated.ok) {
    return { layout: resolveLayout(null, registry), theme: DEFAULT_THEME_SELECTION, source: 'fallback', issues: migrated.issues };
  }
  const value = migrated.value;
  const layout = resolveLayout(value['layout'], registry);
  const theme = validateThemeSelection(value['theme'], knownThemeIds);
  const issues = [
    ...layout.issues.map((i) => ({ path: `layout${i.path === '' ? '' : `.${i.path}`}`, message: i.message })),
    ...(theme.ok ? [] : theme.issues),
  ];
  return {
    layout,
    theme: theme.ok ? theme.value : DEFAULT_THEME_SELECTION,
    source: issues.length === 0 ? 'config' : 'fallback',
    issues,
  };
}

/** Steps for the project UI envelope, keyed by the version they migrate FROM (empty: v1 is the first shape). */
export const PROJECT_UI_MIGRATIONS: Readonly<Record<number, LayoutMigration>> = {};

export interface UpgradeOptions {
  readonly projectUi?: { readonly currentVersion?: number; readonly migrations?: Readonly<Record<number, LayoutMigration>> };
  readonly layout?: { readonly currentVersion?: number; readonly migrations?: Readonly<Record<number, LayoutMigration>> };
}

/**
 * Bring a stored project UI config (a draft or a revision written by an older release) up to the shapes this code
 * understands: the envelope first, then the nested layout config. Run when READING from storage; the upgraded form
 * is written back the next time that row is saved, so no bulk data migration is required. Configs from a NEWER
 * release are rejected, not guessed at.
 */
export function upgradeProjectUiConfig(stored: unknown, options: UpgradeOptions = {}): LayoutResult<ProjectUiConfig> {
  const envelope = migrateLayoutConfig(stored, {
    currentVersion: options.projectUi?.currentVersion ?? CURRENT_PROJECT_UI_VERSION,
    migrations: options.projectUi?.migrations ?? PROJECT_UI_MIGRATIONS,
  });
  if (!envelope.ok) return envelope;
  const layout = migrateLayoutConfig(envelope.value['layout'], {
    currentVersion: options.layout?.currentVersion ?? CURRENT_LAYOUT_VERSION,
    ...(options.layout?.migrations === undefined ? {} : { migrations: options.layout.migrations }),
  });
  if (!layout.ok) return { ok: false, issues: layout.issues.map((i) => ({ path: `layout${i.path === '' ? '' : `.${i.path}`}`, message: i.message })) };
  return { ok: true, value: { ...envelope.value, layout: layout.value } as unknown as ProjectUiConfig };
}
