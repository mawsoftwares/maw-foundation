import type { LogLevel } from '@mawsoftwares/sdk/kernel/logger';
import { getEnv, getEnvBool, getEnvInt } from '@mawsoftwares/config';

export interface ObservabilityConfig {
  logLevel: LogLevel;
  logFormat: 'json' | 'pretty';
  namespaceLevels?: Record<string, LogLevel>;
  redactKeys?: string[];
  metrics: { enabled: boolean; cardinalityLimit: number };
  tracing: { enabled: boolean };
  errorTracking: { enabled: boolean };
  health: { defaultTimeoutMs: number };
  shutdown: { gracePeriodMs: number; hookTimeoutMs: number };
  performance: { defaultWarnThresholdMs: number };
}

export function loadObservabilityConfig(): ObservabilityConfig {
  const isProduction = getEnv('NODE_ENV', 'development') === 'production';

  let namespaceLevels: Record<string, LogLevel> | undefined;
  const namespaceLevelsRaw = getEnv('LOG_NAMESPACE_LEVELS', '');
  if (namespaceLevelsRaw) {
    try {
      namespaceLevels = JSON.parse(namespaceLevelsRaw) as Record<string, LogLevel>;
    } catch {
      // ignore invalid JSON
    }
  }

  let redactKeys: string[] | undefined;
  const redactKeysRaw = getEnv('LOG_REDACT_KEYS', '');
  if (redactKeysRaw) {
    redactKeys = redactKeysRaw.split(',').map((k) => k.trim()).filter(Boolean);
  }

  return {
    logLevel: getEnv('LOG_LEVEL', 'info') as LogLevel,
    logFormat: (getEnv('LOG_FORMAT', isProduction ? 'json' : 'pretty') as 'json' | 'pretty'),
    namespaceLevels,
    redactKeys,
    metrics: {
      enabled: getEnvBool('METRICS_ENABLED', true),
      cardinalityLimit: getEnvInt('METRICS_CARDINALITY_LIMIT', 100),
    },
    tracing: {
      enabled: getEnvBool('TRACING_ENABLED', false),
    },
    errorTracking: {
      enabled: getEnvBool('ERROR_TRACKING_ENABLED', true),
    },
    health: {
      defaultTimeoutMs: getEnvInt('HEALTH_CHECK_TIMEOUT_MS', 5000),
    },
    shutdown: {
      gracePeriodMs: getEnvInt('SHUTDOWN_GRACE_PERIOD_MS', 30_000),
      hookTimeoutMs: getEnvInt('SHUTDOWN_HOOK_TIMEOUT_MS', 10_000),
    },
    performance: {
      defaultWarnThresholdMs: getEnvInt('PERF_WARN_THRESHOLD_MS', 1000),
    },
  };
}
