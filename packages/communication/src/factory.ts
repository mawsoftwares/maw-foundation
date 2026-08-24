import type { NotificationChannelValue, Logger } from '@maw/sdk';
import { NotificationChannel } from '@maw/sdk';
import { NotificationService } from './notification-service';
import { NotificationProviderRegistry } from './provider-registry';
import { MustacheTemplateRenderer } from './template-renderer';
import { ConsoleNotificationProvider } from './providers/console-provider';

export interface CommunicationConfig {
  readonly providers?: Readonly<Record<string, NotificationChannelValue>>;
  readonly logger?: Logger;
  readonly useConsoleProviders?: boolean;
}

export interface CommunicationModule {
  readonly service: NotificationService;
  readonly registry: NotificationProviderRegistry;
  readonly templateRenderer: MustacheTemplateRenderer;
}

export function createCommunication(config?: CommunicationConfig): CommunicationModule {
  const registry = new NotificationProviderRegistry();
  const templateRenderer = new MustacheTemplateRenderer();

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
    logger: config?.logger,
  });

  return { service, registry, templateRenderer };
}
