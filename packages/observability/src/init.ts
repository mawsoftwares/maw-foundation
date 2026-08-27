import type { LogTransport } from '@mawsoftwares/sdk/kernel/logger';
import { consoleTransport, jsonTransport } from '@mawsoftwares/sdk/kernel/logger';
import type { ObservabilityConfig } from './config/schema.js';
import { loadObservabilityConfig } from './config/schema.js';
import { type EnhancedLogger, createEnhancedLogger } from './logger/enhanced-logger.js';
import { type MetricsProvider, type MetricsService, createMetricsService } from './metrics/types.js';
import { InMemoryMetricsProvider } from './metrics/in-memory-provider.js';
import { type TracingProvider, type TracingService, createTracingService } from './tracing/types.js';
import { NoopTracingProvider } from './tracing/noop-provider.js';
import { type ErrorTrackingProvider, type ErrorTrackingService, createErrorTrackingService } from './errors/types.js';
import { LoggerFallbackProvider } from './errors/logger-fallback-provider.js';
import { type HealthCheckService, createHealthCheckService } from './health/enhanced-health.js';
import { ShutdownManager } from './shutdown/shutdown-manager.js';

export interface ObservabilityServices {
  logger: EnhancedLogger;
  metrics: MetricsService;
  tracing: TracingService;
  errorTracking: ErrorTrackingService;
  health: HealthCheckService;
  shutdown: ShutdownManager;
  config: ObservabilityConfig;
}

export interface InitOptions extends Partial<ObservabilityConfig> {
  metricsProvider?: MetricsProvider;
  tracingProvider?: TracingProvider;
  errorTrackingProvider?: ErrorTrackingProvider;
  transports?: LogTransport[];
}

export function initializeObservability(overrides?: InitOptions): ObservabilityServices {
  const config = { ...loadObservabilityConfig(), ...stripProviders(overrides) };

  const transport = resolveTransport(config, overrides?.transports);

  const logger = createEnhancedLogger({
    namespace: 'app',
    level: config.logLevel,
    transport,
    namespaceLevels: config.namespaceLevels,
    redactKeys: config.redactKeys,
  });

  const metricsProvider = overrides?.metricsProvider
    ?? (config.metrics.enabled ? new InMemoryMetricsProvider() : new InMemoryMetricsProvider());
  const metrics = createMetricsService(metricsProvider, logger, config.metrics.cardinalityLimit);

  const tracingProvider = overrides?.tracingProvider ?? new NoopTracingProvider();
  const tracing = createTracingService(tracingProvider, logger);

  const errorTrackingProvider = overrides?.errorTrackingProvider
    ?? (config.errorTracking.enabled ? new LoggerFallbackProvider(logger) : new LoggerFallbackProvider(logger));
  const errorTracking = createErrorTrackingService(errorTrackingProvider, logger, config.redactKeys);

  const health = createHealthCheckService({
    defaultTimeoutMs: config.health.defaultTimeoutMs,
  });

  const shutdown = new ShutdownManager(logger, config.shutdown.hookTimeoutMs);

  shutdown.register({ name: 'metrics', fn: () => metrics.shutdown(), order: 900 });
  shutdown.register({ name: 'tracing', fn: () => tracing.shutdown(), order: 901 });
  shutdown.register({ name: 'errorTracking', fn: () => errorTracking.shutdown(), order: 902 });

  return { logger, metrics, tracing, errorTracking, health, shutdown, config };
}

function resolveTransport(config: ObservabilityConfig, transports?: LogTransport[]): LogTransport {
  if (transports && transports.length > 0) {
    const { createMultiTransport } = require('./logger/multi-transport.js') as typeof import('./logger/multi-transport.js');
    return createMultiTransport(transports);
  }
  return config.logFormat === 'json' ? jsonTransport : consoleTransport;
}

function stripProviders(overrides?: InitOptions): Partial<ObservabilityConfig> | undefined {
  if (!overrides) return undefined;
  const { metricsProvider: _m, tracingProvider: _t, errorTrackingProvider: _e, transports: _tr, ...rest } = overrides;
  return rest;
}
