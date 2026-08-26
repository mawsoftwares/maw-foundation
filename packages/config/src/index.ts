/**
 * @maw/config — Central configuration foundation.
 *
 * Re-exports the multi-level config engine, env utilities, app/tenant/UI config
 * shapes, health checker, and version utilities from @maw/sdk where they were
 * originally implemented. New consumers should import from "@maw/config".
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
} from '@maw/sdk';

// Config schemas
export {
  type AppConfig,
  APP_CONFIG_DEFAULTS,
  type TenantConfig,
  type UIConfig,
  UI_CONFIG_DEFAULTS,
} from '@maw/sdk';

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
} from '@maw/sdk';

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
} from '@maw/sdk';

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
} from '@maw/sdk';
