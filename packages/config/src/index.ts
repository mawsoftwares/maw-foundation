/**
 * @mawsoftwares/config — Central configuration foundation.
 *
 * Re-exports the multi-level config engine, env utilities, app/tenant/UI config
 * shapes, health checker, and version utilities from @mawsoftwares/sdk where they were
 * originally implemented. New consumers should import from "@mawsoftwares/config".
 */

// Config engine (multi-level: environment → app → tenant → module → user)
export {
  createConfigEngine,
  applyTenantConfig,
  applyModuleConfig,
  type ConfigEngine,
  type ConfigLayer,
  type ConfigValue,
  type ConfigObject,
  type ConfigChangeListener,
} from '@mawsoftwares/sdk';

// Config schemas
export {
  type AppConfig,
  APP_CONFIG_DEFAULTS,
  type TenantConfig,
  type UIConfig,
  UI_CONFIG_DEFAULTS,
} from '@mawsoftwares/sdk';

// Env utilities
export {
  getEnv,
  getRequiredEnv,
  getEnvInt,
  getEnvBool,
  loadTypedConfig,
  type ConfigSchema,
  isServer,
  isBrowser,
  isReactNative,
  detectRuntime,
  type Runtime,
} from '@mawsoftwares/sdk';

// Health
export {
  createHealthChecker,
  pgCheck,
  redisCheck,
  httpCheck,
  type HealthChecker,
  type HealthReport,
  type HealthStatus,
  type CheckResult,
  type HealthCheckFn,
} from '@mawsoftwares/sdk';

// Version
export {
  parseVersion,
  formatVersion,
  compareVersions,
  isNewerThan,
  satisfiesMinimum,
  setBuildInfo,
  getBuildInfo,
  getAppVersion,
  type AppVersion,
  type BuildInfo,
} from '@mawsoftwares/sdk';
