import { getEnv, getEnvInt } from '@mawsoftwares/sdk';
import { EnvironmentError, readDisabledModules } from '@mawsoftwares/server-express';

export interface ServerEnv {
  readonly databaseUrl: string;
  readonly jwtSecret: string;
  readonly port: number;
  /** Module keys switched off via `DISABLED_MODULES` (comma separated). */
  readonly disabledModules: readonly string[];
  /** Tenant every request belongs to in `single` mode (`DEFAULT_TENANT_ID`, default `demo-tenant`). */
  readonly defaultTenantId: string;
}

/**
 * Reads and validates the variables needed to construct the app. Secret strength checks stay in
 * `validateSecuritySecrets` inside `createApp`. Values are never included in error messages.
 */
export function readServerEnv(): ServerEnv {
  const issues: string[] = [];

  const databaseUrl = getEnv('DATABASE_URL');
  if (databaseUrl === undefined || databaseUrl === '') issues.push('DATABASE_URL is required');

  let port = 4000;
  try {
    port = getEnvInt('PORT', 4000);
  } catch {
    issues.push('PORT must be an integer');
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) issues.push('PORT must be between 0 and 65535');

  // TENANT_MODE: only `single` is implemented; refuse anything else rather than silently falling back.
  const tenantMode = getEnv('TENANT_MODE', 'single');
  if (tenantMode !== 'single') issues.push('TENANT_MODE must be "single" (multi-tenant resolvers are not enabled in this release)');
  const defaultTenantId = (getEnv('DEFAULT_TENANT_ID') ?? 'demo-tenant').trim();
  if (defaultTenantId === '') issues.push('DEFAULT_TENANT_ID must not be empty');

  if (issues.length > 0 || databaseUrl === undefined) throw new EnvironmentError(issues);
  return { databaseUrl, jwtSecret: getEnv('JWT_SECRET', 'dev-only-secret-change-me') ?? '', port, disabledModules: readDisabledModules(), defaultTenantId };
}
