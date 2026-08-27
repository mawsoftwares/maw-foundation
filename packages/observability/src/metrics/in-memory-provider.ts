import type { MetricsProvider, Counter, Gauge, Histogram, Labels } from './types.js';

interface MetricEntry {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  labels?: Labels;
  value: number;
  observations?: number[];
}

export class InMemoryMetricsProvider implements MetricsProvider {
  private readonly metrics = new Map<string, MetricEntry>();

  private key(name: string, labels?: Labels): string {
    return labels && Object.keys(labels).length > 0
      ? `${name}|${JSON.stringify(labels)}`
      : name;
  }

  counter(name: string, labels?: Labels): Counter {
    const k = this.key(name, labels);
    if (!this.metrics.has(k)) {
      this.metrics.set(k, { name, type: 'counter', labels, value: 0 });
    }
    const entry = this.metrics.get(k)!;
    return {
      inc(value = 1) {
        entry.value += value;
      },
    };
  }

  gauge(name: string, labels?: Labels): Gauge {
    const k = this.key(name, labels);
    if (!this.metrics.has(k)) {
      this.metrics.set(k, { name, type: 'gauge', labels, value: 0 });
    }
    const entry = this.metrics.get(k)!;
    return {
      set(value: number) { entry.value = value; },
      inc(value = 1) { entry.value += value; },
      dec(value = 1) { entry.value -= value; },
    };
  }

  histogram(name: string, _buckets: number[], labels?: Labels): Histogram {
    const k = this.key(name, labels);
    if (!this.metrics.has(k)) {
      this.metrics.set(k, { name, type: 'histogram', labels, value: 0, observations: [] });
    }
    const entry = this.metrics.get(k)!;
    return {
      observe(value: number) {
        entry.observations!.push(value);
        entry.value = entry.observations!.length;
      },
    };
  }

  async shutdown(): Promise<void> {
    this.metrics.clear();
  }

  getSnapshot(): Map<string, MetricEntry> {
    return new Map(this.metrics);
  }

  reset(): void {
    this.metrics.clear();
  }
}
