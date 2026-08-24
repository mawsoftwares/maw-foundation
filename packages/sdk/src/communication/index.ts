export {
  NotificationChannel,
  DeliveryStatus,
  NotificationPriority,
  type NotificationChannelValue,
  type DeliveryStatusValue,
  type NotificationPriorityValue,
  type NotificationMetadata,
  type EmailAttachment,
  type EmailRequest,
  type SmsRequest,
  type WhatsAppRequest,
  type PushRequest,
  type InAppRequest,
  type NotificationRequest,
  type NotificationResult,
  type InAppNotification,
  type TemplateVariable,
  type NotificationTemplate,
} from './types';

export type {
  INotificationProvider,
  INotificationProviderRegistry,
  ITemplateRenderer,
  ITemplateStore,
  IInAppNotificationStore,
  INotificationService,
} from './contracts';

export {
  NotificationError,
  ProviderError,
  TemplateError,
  ProviderNotFoundError,
} from './errors';
