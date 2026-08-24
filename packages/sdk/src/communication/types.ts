import type { ID } from '../kernel/ids';

export const NotificationChannel = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  PUSH: 'PUSH',
  IN_APP: 'IN_APP',
} as const;

export type NotificationChannelValue = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const DeliveryStatus = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type DeliveryStatusValue = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

export const NotificationPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type NotificationPriorityValue = (typeof NotificationPriority)[keyof typeof NotificationPriority];

export interface NotificationMetadata {
  readonly tenantId: string;
  readonly userId?: string;
  readonly actorId?: string;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly correlationId?: string;
  readonly source?: string;
  readonly priority?: NotificationPriorityValue;
  readonly idempotencyKey?: string;
  readonly [key: string]: unknown;
}

export interface EmailAttachment {
  readonly filename: string;
  readonly content: string | Buffer;
  readonly contentType: string;
  readonly disposition?: 'attachment' | 'inline';
}

export interface EmailRequest {
  readonly to: string | readonly string[];
  readonly cc?: string | readonly string[];
  readonly bcc?: string | readonly string[];
  readonly subject: string;
  readonly body: string;
  readonly html?: string;
  readonly replyTo?: string;
  readonly from?: string;
  readonly attachments?: readonly EmailAttachment[];
  readonly templateId?: string;
  readonly templateVariables?: Readonly<Record<string, unknown>>;
}

export interface SmsRequest {
  readonly to: string;
  readonly message: string;
  readonly templateId?: string;
  readonly templateVariables?: Readonly<Record<string, unknown>>;
}

export interface WhatsAppRequest {
  readonly to: string;
  readonly templateId: string;
  readonly templateVariables?: Readonly<Record<string, unknown>>;
  readonly language?: string;
}

export interface PushRequest {
  readonly deviceTokens: readonly string[];
  readonly platform?: 'ios' | 'android' | 'web';
  readonly title: string;
  readonly body: string;
  readonly data?: Readonly<Record<string, string>>;
  readonly badge?: number;
  readonly sound?: string;
  readonly deepLink?: string;
  readonly imageUrl?: string;
}

export interface InAppRequest {
  readonly userId: string;
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly actionUrl?: string;
}

export interface NotificationRequest {
  readonly id?: ID;
  readonly channel: NotificationChannelValue;
  readonly metadata: NotificationMetadata;
  readonly email?: EmailRequest;
  readonly sms?: SmsRequest;
  readonly whatsApp?: WhatsAppRequest;
  readonly push?: PushRequest;
  readonly inApp?: InAppRequest;
}

export interface NotificationResult {
  readonly id: ID;
  readonly channel: NotificationChannelValue;
  readonly status: DeliveryStatusValue;
  readonly provider?: string;
  readonly providerMessageId?: string;
  readonly error?: string;
  readonly sentAt?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface InAppNotification {
  readonly id: ID;
  readonly userId: string;
  readonly tenantId: string;
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly actionUrl?: string;
  readonly read: boolean;
  readonly createdAt: string;
  readonly readAt?: string;
}

export interface TemplateVariable {
  readonly name: string;
  readonly required?: boolean;
  readonly defaultValue?: string;
}

export interface NotificationTemplate {
  readonly id: string;
  readonly channel: NotificationChannelValue;
  readonly name: string;
  readonly subject?: string;
  readonly body: string;
  readonly html?: string;
  readonly variables?: readonly TemplateVariable[];
}
