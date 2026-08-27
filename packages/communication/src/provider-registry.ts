import type { INotificationProvider, INotificationProviderRegistry, NotificationChannelValue } from '@mawsoftwares/sdk';
import { ProviderNotFoundError } from '@mawsoftwares/sdk';

export class NotificationProviderRegistry implements INotificationProviderRegistry {
  private readonly providers = new Map<NotificationChannelValue, INotificationProvider>();

  register(provider: INotificationProvider): void {
    this.providers.set(provider.channel, provider);
  }

  resolve(channel: NotificationChannelValue): INotificationProvider {
    const provider = this.providers.get(channel);
    if (!provider) throw new ProviderNotFoundError(channel);
    return provider;
  }

  has(channel: NotificationChannelValue): boolean {
    return this.providers.has(channel);
  }

  channels(): readonly NotificationChannelValue[] {
    return Array.from(this.providers.keys());
  }
}
