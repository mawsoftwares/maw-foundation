import type { IInAppNotificationStore, ITemplateStore, NotificationChannelValue, Logger } from '@mawsoftwares/sdk';
import { NotificationChannel } from '@mawsoftwares/sdk';
import { NotificationService } from './notification-service';
import { NotificationProviderRegistry } from './provider-registry';
import { MustacheTemplateRenderer } from './template-renderer';
import { ConsoleNotificationProvider } from './providers/console-provider';
import { InMemoryInAppNotificationStore } from './in-app-store';
import { InMemoryTemplateStore } from './template-store';
import { EmailService } from './EmailService';
import { SmsService } from './SmsService';
import { InAppNotificationService } from './InAppNotificationService';

export interface CommunicationConfig {
  readonly providers?: Readonly<Record<string, NotificationChannelValue>>;
  readonly logger?: Logger;
  readonly useConsoleProviders?: boolean;
  readonly defaultFromEmail?: string;
  readonly templateStore?: ITemplateStore;
  readonly inAppStore?: IInAppNotificationStore;
}

export interface CommunicationModule {
  readonly service: NotificationService;
  readonly registry: NotificationProviderRegistry;
  readonly templateRenderer: MustacheTemplateRenderer;
  readonly templateStore: ITemplateStore;
  readonly inAppStore: IInAppNotificationStore;
  readonly emailService: EmailService;
  readonly smsService: SmsService;
  readonly inAppNotificationService: InAppNotificationService;
}

export function createCommunication(config?: CommunicationConfig): CommunicationModule {
  const registry = new NotificationProviderRegistry();
  const templateRenderer = new MustacheTemplateRenderer();
  const templateStore = config?.templateStore ?? new InMemoryTemplateStore();
  const inAppStore = config?.inAppStore ?? new InMemoryInAppNotificationStore();

  if (config?.useConsoleProviders !== false) {
    const channels: NotificationChannelValue[] = [
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
      NotificationChannel.WHATSAPP,
      NotificationChannel.PUSH,
      NotificationChannel.IN_APP,
    ];
    for (const channel of channels) {
      if (!registry.has(channel)) {
        registry.register(new ConsoleNotificationProvider(channel));
      }
    }
  }

  const service = new NotificationService({
    registry,
    templateRenderer,
    templateStore,
    logger: config?.logger,
  });

  const emailService = new EmailService({
    notificationService: service,
    defaultFrom: config?.defaultFromEmail,
  });

  const smsService = new SmsService({
    notificationService: service,
  });

  const inAppNotificationService = new InAppNotificationService({
    notificationService: service,
    store: inAppStore,
  });

  return {
    service,
    registry,
    templateRenderer,
    templateStore,
    inAppStore,
    emailService,
    smsService,
    inAppNotificationService,
  };
}
