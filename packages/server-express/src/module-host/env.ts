import { getEnv } from '@mawsoftwares/sdk';

/** Raised when required environment configuration is missing or malformed; lists every problem. Values are never included. */
export class EnvironmentError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid environment configuration:\n- ${issues.join('\n- ')}`);
    this.name = 'EnvironmentError';
  }
}

/** Splits a comma separated list of module keys (trimmed, empty entries dropped). */
export function parseModuleList(value: string | undefined): readonly string[] {
  return (value ?? '').split(',').map((k) => k.trim()).filter((k) => k !== '');
}

/** Module keys switched off through the `DISABLED_MODULES` environment variable. */
export function readDisabledModules(): readonly string[] {
  return parseModuleList(getEnv('DISABLED_MODULES'));
}
