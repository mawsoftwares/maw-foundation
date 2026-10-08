import type { ThemeOverrides } from '../index';
import { stableJson } from './literal';

export const THEME_FILE_FORMAT = 'maw-theme';
export const THEME_FILE_VERSION = 1;

export interface ThemeFile {
  readonly format: typeof THEME_FILE_FORMAT;
  readonly version: typeof THEME_FILE_VERSION;
  readonly name?: string;
  /** Id of the theme these overrides are layered on (see `createThemeRegistry`). */
  readonly extends?: string;
  readonly overrides: ThemeOverrides;
}

export interface ExportJsonOptions {
  readonly name?: string;
  readonly extends?: string;
  /** Keep `source` / `confidence` per token. Default `true`: the JSON file is the theme's record. */
  readonly includeProvenance?: boolean;
}

export class ThemeFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThemeFileError';
  }
}

export function stripProvenance(overrides: ThemeOverrides): ThemeOverrides {
  const { provenance: _omit, ...rest } = overrides;
  return rest;
}

export function exportThemeJson(overrides: ThemeOverrides, options: ExportJsonOptions = {}): string {
  const file: ThemeFile = {
    format: THEME_FILE_FORMAT,
    version: THEME_FILE_VERSION,
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(options.extends === undefined ? {} : { extends: options.extends }),
    overrides: options.includeProvenance === false ? stripProvenance(overrides) : overrides,
  };
  return stableJson(file);
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Groups of `ThemeOverrides` and what a leaf in each must be. */
const SHAPE: Readonly<Record<string, 'string' | 'number' | 'map' | 'free'>> = {
  branding: 'free', palette: 'string', paletteDark: 'string', spacing: 'number', radius: 'number', shadows: 'string',
  transitions: 'string', typography: 'free', shell: 'string', components: 'map', extraTokens: 'string', extraTokensDark: 'string',
  responsive: 'free', provenance: 'free',
};

function validateOverrides(raw: unknown): ThemeOverrides {
  if (!isObject(raw)) throw new ThemeFileError('"overrides" must be an object');
  for (const [group, value] of Object.entries(raw)) {
    const shape = SHAPE[group];
    if (shape === undefined) throw new ThemeFileError(`Unknown theme section "${group}"`);
    if (!isObject(value)) throw new ThemeFileError(`Theme section "${group}" must be an object`);
    if (shape === 'free') continue;
    for (const [key, leaf] of Object.entries(value)) {
      if (shape === 'map') {
        if (!isObject(leaf) || !Object.values(leaf).every((v) => typeof v === 'string')) {
          throw new ThemeFileError(`${group}.${key} must be an object of strings`);
        }
      } else if (typeof leaf !== shape) {
        throw new ThemeFileError(`${group}.${key} must be a ${shape}`);
      }
    }
  }
  return raw as ThemeOverrides;
}

/** Read and validate a `theme.json`. Rejects other formats, newer versions, and malformed sections. */
export function parseThemeJson(text: string): ThemeFile {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new ThemeFileError('Not valid JSON'); }
  if (!isObject(raw) || raw.format !== THEME_FILE_FORMAT) throw new ThemeFileError(`Not a ${THEME_FILE_FORMAT} file`);
  if (raw.version !== THEME_FILE_VERSION) throw new ThemeFileError(`Unsupported theme file version ${String(raw.version)} (expected ${THEME_FILE_VERSION})`);
  const overrides = validateOverrides(raw.overrides);
  return {
    format: THEME_FILE_FORMAT,
    version: THEME_FILE_VERSION,
    ...(typeof raw.name === 'string' ? { name: raw.name } : {}),
    ...(typeof raw.extends === 'string' ? { extends: raw.extends } : {}),
    overrides,
  };
}
