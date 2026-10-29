import { CURRENT_LAYOUT_VERSION, type LayoutIssue, type LayoutResult } from './types';

/** A step takes the shape of version N and returns the shape of version N+1. Pure; must not throw on valid N. */
export type LayoutMigration = (config: Record<string, unknown>) => Record<string, unknown>;

/**
 * Keyed by the version it migrates FROM. Empty today (v1 is the first shape); when the schema changes,
 * bump CURRENT_LAYOUT_VERSION and add `1: (c) => ({ ...c, version: 2, ... })`.
 */
export const LAYOUT_MIGRATIONS: Readonly<Record<number, LayoutMigration>> = {};

export interface MigrateOptions {
  readonly currentVersion?: number;
  readonly migrations?: Readonly<Record<number, LayoutMigration>>;
}

const fail = (message: string): LayoutResult<never> => ({ ok: false, issues: [{ path: 'version', message }] });

/**
 * Bring a stored config up to the current version. Configs from a newer release than this code understands are
 * rejected rather than guessed at (callers fall back to the default layout).
 */
export function migrateLayoutConfig(input: unknown, options: MigrateOptions = {}): LayoutResult<Record<string, unknown>> {
  const current = options.currentVersion ?? CURRENT_LAYOUT_VERSION;
  const steps = options.migrations ?? LAYOUT_MIGRATIONS;
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: [{ path: '', message: 'Expected an object.' } satisfies LayoutIssue] };
  }
  let config = input as Record<string, unknown>;
  const declared = config['version'];
  if (typeof declared !== 'number' || !Number.isInteger(declared) || declared < 1) return fail('Expected a positive integer.');
  let version: number = declared;
  if (version > current) return fail(`Version ${version} is newer than the supported version ${current}.`);
  while (version < current) {
    const step: LayoutMigration | undefined = steps[version];
    if (step === undefined) return fail(`No migration from version ${version}.`);
    config = step(config);
    const next: unknown = config['version'];
    if (typeof next !== 'number' || next <= version) return fail(`Migration from version ${version} did not advance the version.`);
    version = next;
  }
  return { ok: true, value: config };
}
