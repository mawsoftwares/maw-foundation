import type { Logger, LogLevel } from '@mawsoftwares/sdk/kernel/logger';

export interface MockLogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}

export class MockLogger implements Logger {
  readonly entries: MockLogEntry[] = [];
  private readonly namespace: string;

  constructor(namespace = 'test') {
    this.namespace = namespace;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.entries.push({ level: 'debug', message, context });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.entries.push({ level: 'info', message, context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.entries.push({ level: 'warn', message, context });
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.entries.push({ level: 'error', message, context });
  }

  child = (ns: string): MockLogger => {
    const child = new MockLogger(`${this.namespace}:${ns}`);
    const origPush = child.entries.push.bind(child.entries);
    child.entries.push = (...items: MockLogEntry[]) => {
      this.entries.push(...items);
      return origPush(...items);
    };
    return child;
  };

  assertLogged(level: LogLevel, pattern: string | RegExp): void {
    const matcher = typeof pattern === 'string'
      ? (msg: string) => msg.includes(pattern)
      : (msg: string) => pattern.test(msg);
    const found = this.entries.some((e) => e.level === level && matcher(e.message));
    if (!found) {
      throw new Error(`Expected a "${level}" log matching "${String(pattern)}" but none was found.\nEntries: ${JSON.stringify(this.entries, null, 2)}`);
    }
  }

  assertNotLogged(level: LogLevel, pattern: string | RegExp): void {
    const matcher = typeof pattern === 'string'
      ? (msg: string) => msg.includes(pattern)
      : (msg: string) => pattern.test(msg);
    const found = this.entries.find((e) => e.level === level && matcher(e.message));
    if (found) {
      throw new Error(`Expected no "${level}" log matching "${String(pattern)}" but found: "${found.message}"`);
    }
  }

  reset(): void {
    this.entries.length = 0;
  }
}
