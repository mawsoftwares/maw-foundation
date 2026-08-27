import type { Logger } from '@mawsoftwares/sdk/kernel/logger';

export type Labels = Record<string, string>;

export interface Counter {
  inc(value?: number): void;
}

export interface Gauge {
  set(value: number): void;
  inc(value?: number): void;
  dec(value?: number): void;
}

export interface Histogram {
  observe(value: number): void;
}

export interface MetricsProvider {
  counter(name: string, labels?: Labels): Counter;
  gauge(name: string, labels?: Labels): Gauge;
  histogram(name: string, buckets: number[], labels?: Labels): Histogram;
  shutdown(): Promise<void>;
}

export interface MetricsService {
  counter(name: string, labels?: Labels): Counter;
  gauge(name: string, labels?: Labels): Gauge;
  histogram(name: string, buckets: number[], labels?: Labels): Histogram;
  shutdown(): Promise<void>;
}

const NOOP_COUNTER: Counter = { inc() {} };
const NOOP_GAUGE: Gauge = { set() {}, inc() {}, dec() {} };
const NOOP_HISTOGRAM: Histogram = { observe() {} };

export function createMetricsService(
  provider: MetricsProvider,
  logger: Logger,
  cardinalityLimit = 100,
): MetricsService {
  const cardinalityMap = new Map<string, number>();

  function checkCardinality(name: string, labels?: Labels): boolean {
    if (!labels || Object.keys(labels).length === 0) return true;
    const key = `${name}:${JSON.stringify(labels)}`;
    const current = cardinalityMap.get(name) ?? 0;
    if (!cardinalityMap.has(key)) {
      if (current >= cardinalityLimit) {
        logger.warn(`Cardinality limit exceeded for metric "${name}"`, {
          limit: cardinalityLimit,
          labels,
        });
        return false;
      }
      cardinalityMap.set(name, current + 1);
      cardinalityMap.set(key, 1);
    }
    return true;
  }

  return {
    counter(name: string, labels?: Labels): Counter {
      try {
        if (!checkCardinality(name, labels)) return NOOP_COUNTER;
        return provider.counter(name, labels);
      } catch {
        return NOOP_COUNTER;
      }
    },
    gauge(name: string, labels?: Labels): Gauge {
      try {
        if (!checkCardinality(name, labels)) return NOOP_GAUGE;
        return provider.gauge(name, labels);
      } catch {
        return NOOP_GAUGE;
      }
    },
    histogram(name: string, buckets: number[], labels?: Labels): Histogram {
      try {
        if (!checkCardinality(name, labels)) return NOOP_HISTOGRAM;
        return provider.histogram(name, buckets, labels);
      } catch {
        return NOOP_HISTOGRAM;
      }
    },
    async shutdown(): Promise<void> {
      try {
        await provider.shutdown();
      } catch {
        // fail-safe
      }
    },
  };
}
