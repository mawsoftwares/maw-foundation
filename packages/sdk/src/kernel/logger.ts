/**
 * Lightweight structured logger — isomorphic, zero dependencies.
 * Supports namespaces, log levels, and structured context.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export interface LogEntry {
  level: LogLevel;
  namespace: string;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface LogTransport {
  write(entry: LogEntry): void;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(namespace: string): Logger;
}

// ---------------------------------------------------------------------------
// Console transport (default)
// ---------------------------------------------------------------------------

const LEVEL_METHODS: Record<Exclude<LogLevel, 'silent'>, 'debug' | 'info' | 'warn' | 'error'> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

export const consoleTransport: LogTransport = {
  write(entry) {
    const method = LEVEL_METHODS[entry.level as keyof typeof LEVEL_METHODS] ?? 'info';
    const prefix = `[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.namespace}]`;
    if (entry.context && Object.keys(entry.context).length > 0) {
      console[method](prefix, entry.message, entry.context);
    } else {
      console[method](prefix, entry.message);
    }
  },
};

// ---------------------------------------------------------------------------
// JSON transport (for structured log aggregators)
// ---------------------------------------------------------------------------

export const jsonTransport: LogTransport = {
  write(entry) {
    const method = LEVEL_METHODS[entry.level as keyof typeof LEVEL_METHODS] ?? 'info';
    console[method](JSON.stringify(entry));
  },
};

// ---------------------------------------------------------------------------
// Noop transport (testing)
// ---------------------------------------------------------------------------

export const noopTransport: LogTransport = {
  write() {},
};

// ---------------------------------------------------------------------------
// Logger config
// ---------------------------------------------------------------------------

let globalLevel: LogLevel = 'info';
let globalTransport: LogTransport = consoleTransport;

export function setLogLevel(level: LogLevel): void {
  globalLevel = level;
}

export function getLogLevel(): LogLevel {
  return globalLevel;
}

export function setLogTransport(transport: LogTransport): void {
  globalTransport = transport;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLogger(namespace: string): Logger {
  function emit(level: Exclude<LogLevel, 'silent'>, message: string, context?: Record<string, unknown>) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[globalLevel]) return;
    globalTransport.write({
      level,
      namespace,
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  }

  const logger: Logger = {
    debug: (msg, ctx) => emit('debug', msg, ctx),
    info: (msg, ctx) => emit('info', msg, ctx),
    warn: (msg, ctx) => emit('warn', msg, ctx),
    error: (msg, ctx) => emit('error', msg, ctx),
    child: (childNs) => createLogger(`${namespace}:${childNs}`),
  };

  return logger;
}
