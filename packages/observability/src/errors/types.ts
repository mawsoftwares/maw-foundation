import type { Logger } from '@mawsoftwares/sdk/kernel/logger';
import { redact } from '@mawsoftwares/platform/security/LogRedactor';
import { getContextOrEmpty } from '../context/store.js';

export interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
}

export interface ErrorTrackingProvider {
  captureException(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, level: 'info' | 'warning' | 'error', context?: ErrorContext): void;
  setUser(user: { id: string; email?: string; tenantId?: string }): void;
  shutdown(): Promise<void>;
}

export interface ErrorTrackingService {
  captureException(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, level: 'info' | 'warning' | 'error', context?: ErrorContext): void;
  setUser(user: { id: string; email?: string; tenantId?: string }): void;
  shutdown(): Promise<void>;
}

export function createErrorTrackingService(
  provider: ErrorTrackingProvider,
  logger: Logger,
  redactKeys?: string[],
): ErrorTrackingService {
  function enrichContext(context?: ErrorContext): ErrorContext {
    const als = getContextOrEmpty();
    const tags: Record<string, string> = { ...context?.tags };
    if (als.requestId) tags['requestId'] = als.requestId;
    if (als.correlationId) tags['correlationId'] = als.correlationId;
    if (als.traceId) tags['traceId'] = als.traceId;
    if (als.tenantId) tags['tenantId'] = als.tenantId;
    if (als.userId) tags['userId'] = als.userId;

    const extra = context?.extra
      ? redact(context.extra, redactKeys) as Record<string, unknown>
      : undefined;

    return {
      tags,
      extra,
      fingerprint: context?.fingerprint,
    };
  }

  return {
    captureException(error: Error, context?: ErrorContext): void {
      try {
        provider.captureException(error, enrichContext(context));
      } catch {
        logger.error('Failed to capture exception', { originalError: error.message });
      }
    },

    captureMessage(message: string, level: 'info' | 'warning' | 'error', context?: ErrorContext): void {
      try {
        provider.captureMessage(message, level, enrichContext(context));
      } catch {
        logger.error('Failed to capture message', { message, level });
      }
    },

    setUser(user: { id: string; email?: string; tenantId?: string }): void {
      try {
        provider.setUser(user);
      } catch {
        // fail-safe
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
