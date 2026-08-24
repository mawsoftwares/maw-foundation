import { describe, expect, it } from 'vitest';
import { createCommunication } from '../factory';
import { MustacheTemplateRenderer } from '../template-renderer';
import { NotificationProviderRegistry } from '../provider-registry';
import { NotificationService } from '../notification-service';
import { ConsoleNotificationProvider } from '../providers/console-provider';
import { InMemoryInAppNotificationStore } from '../in-app-store';
import { NotificationChannel, DeliveryStatus } from '@maw/sdk';
import type { ITemplateStore, NotificationTemplate } from '@maw/sdk';

class InMemoryTemplateStore implements ITemplateStore {
  private readonly templates = new Map<string, NotificationTemplate>();

  add(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  async get(id: string): Promise<NotificationTemplate | null> {
    return this.templates.get(id) ?? null;
  }
}

describe('Communication Integration', () => {
  it('sends email via factory-created service', async () => {
    const { service } = createCommunication();

    const result = await service.send({
      channel: NotificationChannel.EMAIL,
      metadata: { tenantId: 'restaurant-1', correlationId: 'order-123' },
      email: {
        to: 'customer@example.com',
        subject: 'Order Confirmed',
        body: 'Your order #123 has been confirmed.',
      },
    });

    expect(result.status).toBe(DeliveryStatus.SENT);
    expect(result.channel).toBe(NotificationChannel.EMAIL);
    expect(result.provider).toContain('console');
  });

  it('sends SMS via factory-created service', async () => {
    const { service } = createCommunication();

    const result = await service.send({
      channel: NotificationChannel.SMS,
      metadata: { tenantId: 'restaurant-1' },
      sms: { to: '+1234567890', message: 'Your table is ready!' },
    });

    expect(result.status).toBe(DeliveryStatus.SENT);
    expect(result.channel).toBe(NotificationChannel.SMS);
  });

  it('sends notification with template rendering', async () => {
    const registry = new NotificationProviderRegistry();
    registry.register(new ConsoleNotificationProvider(NotificationChannel.EMAIL));

    const templateStore = new InMemoryTemplateStore();
    templateStore.add({
      id: 'welcome-email',
      name: 'Welcome Email',
      channel: NotificationChannel.EMAIL,
      subject: 'Welcome to {{restaurantName}}!',
      body: 'Hi {{customerName}}, thanks for joining {{restaurantName}}.',
      html: '<h1>Welcome {{customerName}}</h1><p>Thanks for joining {{restaurantName}}.</p>',
      variables: [
        { name: 'customerName', required: true, type: 'string' },
        { name: 'restaurantName', required: true, type: 'string' },
      ],
    });

    const service = new NotificationService({
      registry,
      templateRenderer: new MustacheTemplateRenderer(),
      templateStore,
    });

    const result = await service.send({
      channel: NotificationChannel.EMAIL,
      metadata: { tenantId: 'restaurant-1', correlationId: 'signup-42' },
      email: {
        to: 'newuser@example.com',
        subject: 'placeholder',
        body: 'placeholder',
        templateId: 'welcome-email',
        templateVariables: {
          customerName: 'Alice',
          restaurantName: 'Green Bistro',
        },
      },
    });

    expect(result.status).toBe(DeliveryStatus.SENT);
  });

  it('sends batch notifications across channels', async () => {
    const { service } = createCommunication();

    const results = await service.sendBatch([
      {
        channel: NotificationChannel.EMAIL,
        metadata: { tenantId: 'restaurant-1' },
        email: { to: 'a@example.com', subject: 'Order Ready', body: 'Your order is ready.' },
      },
      {
        channel: NotificationChannel.SMS,
        metadata: { tenantId: 'restaurant-1' },
        sms: { to: '+1111111111', message: 'Your order is ready for pickup.' },
      },
      {
        channel: NotificationChannel.PUSH,
        metadata: { tenantId: 'restaurant-1' },
        push: { deviceTokens: ['token-abc'], title: 'Order Ready', body: 'Come pick it up!' },
      },
    ]);

    expect(results).toHaveLength(3);
    results.forEach((r) => expect(r.status).toBe(DeliveryStatus.SENT));
  });

  it('manages in-app notifications lifecycle', async () => {
    const store = new InMemoryInAppNotificationStore();

    await store.create({
      id: 'n1',
      userId: 'waiter-1',
      tenantId: 'restaurant-1',
      type: 'order',
      title: 'New Order',
      message: 'Table 5 placed an order.',
      read: false,
      createdAt: new Date().toISOString(),
    });

    await store.create({
      id: 'n2',
      userId: 'waiter-1',
      tenantId: 'restaurant-1',
      type: 'alert',
      title: 'Kitchen Alert',
      message: 'Item 42 is out of stock.',
      read: false,
      createdAt: new Date(Date.now() + 1000).toISOString(),
    });

    await store.create({
      id: 'n3',
      userId: 'waiter-2',
      tenantId: 'restaurant-1',
      type: 'order',
      title: 'New Order',
      message: 'Table 3 placed an order.',
      read: false,
      createdAt: new Date().toISOString(),
    });

    const waiter1Notifications = await store.list('waiter-1', 'restaurant-1');
    expect(waiter1Notifications).toHaveLength(2);

    const unreadCount = await store.unreadCount('waiter-1', 'restaurant-1');
    expect(unreadCount).toBe(2);

    await store.markAsRead('n1', 'waiter-1');
    expect(await store.unreadCount('waiter-1', 'restaurant-1')).toBe(1);

    await store.markAllAsRead('waiter-1', 'restaurant-1');
    expect(await store.unreadCount('waiter-1', 'restaurant-1')).toBe(0);

    await store.delete('n2', 'waiter-1');
    expect(await store.list('waiter-1', 'restaurant-1')).toHaveLength(1);

    const waiter2Notifications = await store.list('waiter-2', 'restaurant-1');
    expect(waiter2Notifications).toHaveLength(1);
  });
});
