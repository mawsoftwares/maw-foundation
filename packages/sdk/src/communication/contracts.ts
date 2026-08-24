import type {
  NotificationRequest,
  NotificationResult,
  NotificationChannelValue,
  InAppNotification,
  NotificationTemplate,
} from './types';

export interface INotificationProvider {
  readonly channel: NotificationChannelValue;
  readonly name: string;
  send(request: NotificationRequest): Promise<NotificationResult>;
}

export interface INotificationProviderRegistry {
  register(provider: INotificationProvider): void;
  resolve(channel: NotificationChannelValue): INotificationProvider;
  has(channel: NotificationChannelValue): boolean;
  channels(): readonly NotificationChannelValue[];
}

export interface ITemplateRenderer {
  render(template: string, variables: Readonly<Record<string, unknown>>): string;
}

export interface ITemplateStore {
  get(templateId: string): Promise<NotificationTemplate | null>;
  list(channel?: NotificationChannelValue): Promise<readonly NotificationTemplate[]>;
  save(template: NotificationTemplate): Promise<void>;
  delete(templateId: string): Promise<void>;
}

export interface IInAppNotificationStore {
  create(notification: InAppNotification): Promise<void>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  markAllAsRead(userId: string, tenantId: string): Promise<void>;
  list(userId: string, tenantId: string, options?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<readonly InAppNotification[]>;
  unreadCount(userId: string, tenantId: string): Promise<number>;
  delete(notificationId: string, userId: string): Promise<void>;
}

export interface INotificationService {
  send(request: NotificationRequest): Promise<NotificationResult>;
  sendBatch(requests: readonly NotificationRequest[]): Promise<readonly NotificationResult[]>;
}
