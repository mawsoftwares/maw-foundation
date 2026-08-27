import { randomUUID } from 'node:crypto';
import type { TracingProvider, Span } from './types.js';

export class NoopTracingProvider implements TracingProvider {
  startSpan(name: string): Span {
    return {
      traceId: randomUUID(),
      spanId: randomUUID(),
      name,
      setAttribute() {},
      setStatus() {},
      end() {},
    };
  }

  async shutdown(): Promise<void> {}
}
