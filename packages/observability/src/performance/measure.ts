import { performance } from 'node:perf_hooks';
import type { Logger } from '@mawsoftwares/sdk/kernel/logger';
import type { MetricsService } from '../metrics/types.js';
import type { TracingService } from '../tracing/types.js';

export interface Timer {
  stop(): { durationMs: number };
}

export interface MeasureOptions {
  warnThresholdMs?: number;
  logger?: Logger;
  metrics?: MetricsService;
  tracing?: TracingService;
  histogramBuckets?: number[];
}

export async function measure<T>(
  name: string,
  fn: () => T | Promise<T>,
  options?: MeasureOptions,
): Promise<T> {
  const start = performance.now();

  if (options?.tracing) {
    return options.tracing.withSpan(name, async () => {
      const result = await fn();
      recordDuration(name, start, options);
      return result;
    });
  }

  try {
    const result = await fn();
    recordDuration(name, start, options);
    return result;
  } catch (err) {
    recordDuration(name, start, options);
    throw err;
  }
}

export function startTimer(_name: string): Timer {
  const start = performance.now();
  return {
    stop() {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      return { durationMs };
    },
  };
}

export interface SlowOperationDetector {
  check(operation: string, durationMs: number, logger: Logger): void;
}

export function createSlowOperationDetector(
  thresholds: Record<string, number>,
  defaultThresholdMs = 1000,
): SlowOperationDetector {
  return {
    check(operation: string, durationMs: number, logger: Logger): void {
      const threshold = thresholds[operation] ?? defaultThresholdMs;
      if (durationMs > threshold) {
        logger.warn(`Slow operation detected: "${operation}"`, {
          durationMs,
          thresholdMs: threshold,
        });
      }
    },
  };
}

function recordDuration(name: string, start: number, options?: MeasureOptions): void {
  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  const threshold = options?.warnThresholdMs ?? 1000;

  if (options?.logger && durationMs > threshold) {
    options.logger.warn(`Slow operation: "${name}"`, { durationMs, thresholdMs: threshold });
  }

  if (options?.metrics) {
    const buckets = options.histogramBuckets ?? [10, 50, 100, 250, 500, 1000, 2500, 5000];
    options.metrics.histogram(`operation.duration`, buckets, { operation: name }).observe(durationMs);
  }
}
