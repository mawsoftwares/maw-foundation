import type { Logger } from '@mawsoftwares/sdk/kernel/logger';
import type { ErrorTrackingProvider, ErrorContext } from './types.js';

export class LoggerFallbackProvider implements ErrorTrackingProvider {
  constructor(private readonly logger: Logger) {}

  captureException(error: Error, context?: ErrorContext): void {
    this.logger.error(error.message, {
      stack: error.stack,
      ...context?.tags,
      ...context?.extra,
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error', context?: ErrorContext): void {
    const logLevel = level === 'warning' ? 'warn' : level;
    this.logger[logLevel](message, {
      ...context?.tags,
      ...context?.extra,
    });
  }

  setUser(_user: { id: string; email?: string; tenantId?: string }): void {
    // no-op for logger fallback
  }

  async shutdown(): Promise<void> {}
}
