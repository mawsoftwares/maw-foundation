import type { INotificationProvider, NotificationRequest, NotificationResult, NotificationChannelValue } from '@mawsoftwares/sdk';
import { DeliveryStatus, createLogger } from '@mawsoftwares/sdk';

export class ConsoleNotificationProvider implements INotificationProvider {
  readonly channel: NotificationChannelValue;
  readonly name: string;

  constructor(channel: NotificationChannelValue) {
    this.channel = channel;
    this.name = `console-${channel.toLowerCase()}`;
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    const logger = createLogger(`provider:${this.name}`);
    logger.info('Notification sent (console)', {
      channel: this.channel,
      tenantId: request.metadata.tenantId,
      email: request.email ? { to: request.email.to, subject: request.email.subject } : undefined,
      sms: request.sms ? { to: request.sms.to } : undefined,
      whatsApp: request.whatsApp ? { to: request.whatsApp.to, template: request.whatsApp.templateId } : undefined,
      push: request.push ? { tokens: request.push.deviceTokens.length, title: request.push.title } : undefined,
      inApp: request.inApp ? { userId: request.inApp.userId, type: request.inApp.type } : undefined,
    });

    return {
      id: request.id ?? crypto.randomUUID(),
      channel: this.channel,
      status: DeliveryStatus.SENT,
      provider: this.name,
      providerMessageId: `console-${Date.now()}`,
      sentAt: new Date().toISOString(),
    };
  }
}
