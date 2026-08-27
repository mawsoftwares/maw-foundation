import type { INotificationService, NotificationRequest, NotificationResult, EmailRequest, NotificationMetadata } from '@mawsoftwares/sdk';
import { NotificationChannel, createLogger } from '@mawsoftwares/sdk';

export interface EmailServiceOptions {
  readonly notificationService: INotificationService;
  readonly defaultFrom?: string;
}

export interface SendEmailOptions {
  readonly tenantId: string;
  readonly email: Omit<EmailRequest, 'body'> & { body?: string }; // make body optional if templateId is used
  readonly metadata?: Omit<NotificationMetadata, 'tenantId'>;
}

export class EmailService {
  private readonly notificationService: INotificationService;
  private readonly defaultFrom?: string;
  private readonly logger = createLogger('email-service');

  constructor(options: EmailServiceOptions) {
    this.notificationService = options.notificationService;
    this.defaultFrom = options.defaultFrom;
  }

  /**
   * Sends an email synchronously (awaits delivery result).
   */
  async send(options: SendEmailOptions): Promise<NotificationResult> {
    const { tenantId, email, metadata } = options;

    const request: NotificationRequest = {
      channel: NotificationChannel.EMAIL,
      metadata: {
        ...metadata,
        tenantId,
        source: (metadata as any)?.source ?? 'EmailService',
      },
      email: {
        ...email,
        from: email.from ?? this.defaultFrom,
        body: email.body ?? '', // Fallback to empty string if body not provided (e.g. for templates)
      },
    };

    return this.notificationService.send(request);
  }

  /**
   * Sends an email asynchronously (fire-and-forget).
   * Resolves immediately with void to prevent blocking/timing attacks in request-response cycles.
   */
  sendAsync(options: SendEmailOptions): void {
    const correlationId = options.metadata?.correlationId;
    this.send(options)
      .then((result) => {
        this.logger.debug('Async email sent successfully', {
          id: result.id,
          status: result.status,
          correlationId,
        });
      })
      .catch((error) => {
        this.logger.error('Async email sending failed in background', {
          error: (error as Error).message,
          to: options.email.to,
          correlationId,
        });
      });
  }
}
