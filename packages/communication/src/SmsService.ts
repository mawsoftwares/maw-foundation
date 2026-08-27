import type {
  INotificationService,
  NotificationRequest,
  NotificationResult,
  SmsRequest,
  NotificationMetadata,
} from '@mawsoftwares/sdk';
import { NotificationChannel, createLogger } from '@mawsoftwares/sdk';

export interface SmsServiceOptions {
  readonly notificationService: INotificationService;
}

export interface SendSmsOptions {
  readonly tenantId: string;
  readonly sms: Omit<SmsRequest, 'message'> & { message?: string };
  readonly metadata?: Omit<NotificationMetadata, 'tenantId'>;
}

export class SmsService {
  private readonly notificationService: INotificationService;
  private readonly logger = createLogger('sms-service');

  constructor(options: SmsServiceOptions) {
    this.notificationService = options.notificationService;
  }

  /**
   * Sends an SMS synchronously (awaits delivery result).
   */
  async send(options: SendSmsOptions): Promise<NotificationResult> {
    const { tenantId, sms, metadata } = options;

    const request: NotificationRequest = {
      channel: NotificationChannel.SMS,
      metadata: {
        ...metadata,
        tenantId,
        source: typeof metadata?.source === 'string' ? metadata.source : 'SmsService',
      },
      sms: {
        ...sms,
        message: sms.message ?? '',
      },
    };

    return this.notificationService.send(request);
  }

  /**
   * Sends an SMS asynchronously (fire-and-forget).
   * Resolves immediately with void to prevent blocking request-response cycles.
   */
  sendAsync(options: SendSmsOptions): void {
    const correlationId = options.metadata?.correlationId;
    this.send(options)
      .then((result) => {
        this.logger.debug('Async SMS sent successfully', {
          id: result.id,
          status: result.status,
          correlationId,
        });
      })
      .catch((error) => {
        this.logger.error('Async SMS sending failed in background', {
          error: (error as Error).message,
          to: options.sms.to,
          correlationId,
        });
      });
  }
}
