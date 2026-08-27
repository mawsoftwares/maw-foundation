import type {
  IInAppNotificationStore,
  INotificationService,
  InAppNotification,
  InAppRequest,
  NotificationMetadata,
  NotificationRequest,
  NotificationResult,
} from '@mawsoftwares/sdk';
import { DeliveryStatus, NotificationChannel, createLogger } from '@mawsoftwares/sdk';

export interface InAppNotificationServiceOptions {
  readonly notificationService: INotificationService;
  readonly store: IInAppNotificationStore;
}

export interface SendInAppOptions {
  readonly tenantId: string;
  readonly inApp: InAppRequest;
  readonly metadata?: Omit<NotificationMetadata, 'tenantId'>;
}

export class InAppNotificationService {
  private readonly notificationService: INotificationService;
  private readonly store: IInAppNotificationStore;
  private readonly logger = createLogger('in-app-notification-service');

  constructor(options: InAppNotificationServiceOptions) {
    this.notificationService = options.notificationService;
    this.store = options.store;
  }

  /**
   * Delivers an in-app notification and persists it to the inbox store.
   */
  async send(options: SendInAppOptions): Promise<NotificationResult> {
    const { tenantId, inApp, metadata } = options;
    const id = crypto.randomUUID();

    const request: NotificationRequest = {
      id,
      channel: NotificationChannel.IN_APP,
      metadata: {
        ...metadata,
        tenantId,
        userId: typeof metadata?.userId === 'string' ? metadata.userId : inApp.userId,
        source: typeof metadata?.source === 'string' ? metadata.source : 'InAppNotificationService',
      },
      inApp,
    };

    const result = await this.notificationService.send(request);

    if (result.status !== DeliveryStatus.FAILED) {
      const notification: InAppNotification = {
        id: result.id,
        userId: inApp.userId,
        tenantId,
        type: inApp.type,
        title: inApp.title,
        message: inApp.message,
        data: inApp.data,
        actionUrl: inApp.actionUrl,
        read: false,
        createdAt: new Date().toISOString(),
      };
      await this.store.create(notification);
    }

    return result;
  }

  /**
   * Delivers an in-app notification asynchronously (fire-and-forget).
   */
  sendAsync(options: SendInAppOptions): void {
    const correlationId = options.metadata?.correlationId;
    this.send(options)
      .then((result) => {
        this.logger.debug('Async in-app notification sent successfully', {
          id: result.id,
          status: result.status,
          correlationId,
        });
      })
      .catch((error) => {
        this.logger.error('Async in-app notification sending failed in background', {
          error: (error as Error).message,
          userId: options.inApp.userId,
          correlationId,
        });
      });
  }

  list(
    userId: string,
    tenantId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean },
  ): Promise<readonly InAppNotification[]> {
    return this.store.list(userId, tenantId, options);
  }

  markAsRead(notificationId: string, userId: string): Promise<void> {
    return this.store.markAsRead(notificationId, userId);
  }

  markAllAsRead(userId: string, tenantId: string): Promise<void> {
    return this.store.markAllAsRead(userId, tenantId);
  }

  unreadCount(userId: string, tenantId: string): Promise<number> {
    return this.store.unreadCount(userId, tenantId);
  }

  delete(notificationId: string, userId: string): Promise<void> {
    return this.store.delete(notificationId, userId);
  }
}
