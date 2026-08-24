import { AppError, ErrorCode } from '../kernel/errors';
import type { NotificationChannelValue } from './types';

export class NotificationError extends AppError {
  readonly channel?: NotificationChannelValue;

  constructor(message: string, channel?: NotificationChannelValue, details?: Record<string, unknown>) {
    super(ErrorCode.INTERNAL, message, 500, { ...details, channel });
    this.name = 'NotificationError';
    this.channel = channel;
  }
}

export class ProviderError extends AppError {
  readonly provider: string;
  readonly retryable: boolean;

  constructor(provider: string, message: string, retryable = false, details?: Record<string, unknown>) {
    super(retryable ? ErrorCode.SERVICE_UNAVAILABLE : ErrorCode.INTERNAL, message, retryable ? 503 : 500, { ...details, provider });
    this.name = 'ProviderError';
    this.provider = provider;
    this.retryable = retryable;
  }
}

export class TemplateError extends AppError {
  readonly templateId?: string;

  constructor(message: string, templateId?: string) {
    super(ErrorCode.INVALID_INPUT, message, 400, { templateId });
    this.name = 'TemplateError';
    this.templateId = templateId;
  }
}

export class ProviderNotFoundError extends AppError {
  readonly channel: NotificationChannelValue;

  constructor(channel: NotificationChannelValue) {
    super(ErrorCode.NOT_FOUND, `No provider registered for channel: ${channel}`, 500, { channel });
    this.name = 'ProviderNotFoundError';
    this.channel = channel;
  }
}
