import type { Logger, LogLevel, LogTransport, LogEntry } from '@mawsoftwares/sdk/kernel/logger';
import { consoleTransport, jsonTransport } from '@mawsoftwares/sdk/kernel/logger';
import { redact } from '@mawsoftwares/platform/security/LogRedactor';
import { getContextOrEmpty } from '../context/store.js';
import { createMultiTransport } from './multi-transport.js';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export interface EnhancedLoggerOptions {
  namespace: string;
  level?: LogLevel;
  transport?: LogTransport;
  transports?: LogTransport[];
  namespaceLevels?: Record<string, LogLevel>;
  redactKeys?: string[];
}

export interface EnhancedLogger extends Logger {
  fatal(message: string, context?: Record<string, unknown>): void;
}

export function createEnhancedLogger(options: EnhancedLoggerOptions): EnhancedLogger {
  const {
    namespace,
    level = 'info',
    namespaceLevels,
    redactKeys,
  } = options;

  const transport = resolveTransport(options);

  function getEffectiveLevel(): LogLevel {
    if (namespaceLevels) {
      const parts = namespace.split(':');
      for (let i = parts.length; i > 0; i--) {
        const key = parts.slice(0, i).join(':');
        if (key in namespaceLevels) {
          return namespaceLevels[key]!;
        }
      }
    }
    return level;
  }

  function emit(
    emitLevel: Exclude<LogLevel, 'silent'>,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    const effectiveLevel = getEffectiveLevel();
    if (LEVEL_ORDER[emitLevel] < LEVEL_ORDER[effectiveLevel]) return;

    const alsContext = getContextOrEmpty();
    const merged: Record<string, unknown> = {
      ...filterUndefined(alsContext),
      ...context,
    };

    const redacted = Object.keys(merged).length > 0
      ? redact(merged, redactKeys) as Record<string, unknown>
      : undefined;

    const entry: LogEntry = {
      level: emitLevel,
      namespace,
      message,
      timestamp: new Date().toISOString(),
      context: redacted,
    };

    try {
      transport.write(entry);
    } catch {
      // observability failures never crash the application
    }
  }

  const logger: EnhancedLogger = {
    debug: (msg, ctx) => emit('debug', msg, ctx),
    info: (msg, ctx) => emit('info', msg, ctx),
    warn: (msg, ctx) => emit('warn', msg, ctx),
    error: (msg, ctx) => emit('error', msg, ctx),
    fatal: (msg, ctx) => emit('error', msg, { ...ctx, fatal: true }),
    child: (childNs) =>
      createEnhancedLogger({
        namespace: `${namespace}:${childNs}`,
        level,
        transport,
        namespaceLevels,
        redactKeys,
      }),
  };

  return logger;
}

function resolveTransport(options: EnhancedLoggerOptions): LogTransport {
  if (options.transports && options.transports.length > 0) {
    return createMultiTransport(options.transports);
  }
  if (options.transport) {
    return options.transport;
  }
  return process.env['NODE_ENV'] === 'production' ? jsonTransport : consoleTransport;
}

function filterUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
