import { describe, expect, it } from 'vitest';
import { createCommunication } from '../factory';
import { InMemoryTemplateStore } from '../template-store';
import { NotificationChannel, DeliveryStatus } from '@mawsoftwares/sdk';

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

  it('sends SMS via smsService facade', async () => {
    const { smsService } = createCommunication();

    const result = await smsService.send({
      tenantId: 'restaurant-1',
      sms: { to: '+1234567890', message: 'Your table is ready!' },
    });

    expect(result.status).toBe(DeliveryStatus.SENT);
    expect(result.channel).toBe(NotificationChannel.SMS);
  });

  it('sends notification with template rendering', async () => {
    const templateStore = new InMemoryTemplateStore();
    await templateStore.save({
      id: 'welcome-email',
      name: 'Welcome Email',
      channel: NotificationChannel.EMAIL,
      subject: 'Welcome to {{restaurantName}}!',
      body: 'Hi {{customerName}}, thanks for joining {{restaurantName}}.',
      html: '<h1>Welcome {{customerName}}</h1><p>Thanks for joining {{restaurantName}}.</p>',
      variables: [
        { name: 'customerName', required: true },
        { name: 'restaurantName', required: true },
      ],
    });

    const { emailService } = createCommunication({ templateStore });

    const result = await emailService.send({
      tenantId: 'restaurant-1',
      email: {
        to: 'newuser@example.com',
        subject: 'placeholder',
        templateId: 'welcome-email',
        templateVariables: {
          customerName: 'Alice',
          restaurantName: 'Green Bistro',
        },
      },
      metadata: { correlationId: 'signup-42' },
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

  it('manages in-app notifications lifecycle via facade', async () => {
    const { inAppNotificationService } = createCommunication();

    await inAppNotificationService.send({
      tenantId: 'restaurant-1',
      inApp: {
        userId: 'waiter-1',
        type: 'order',
        title: 'New Order',
        message: 'Table 5 placed an order.',
      },
    });

    await inAppNotificationService.send({
      tenantId: 'restaurant-1',
      inApp: {
        userId: 'waiter-1',
        type: 'alert',
        title: 'Kitchen Alert',
        message: 'Item 42 is out of stock.',
      },
    });

    await inAppNotificationService.send({
      tenantId: 'restaurant-1',
      inApp: {
        userId: 'waiter-2',
        type: 'order',
        title: 'New Order',
        message: 'Table 3 placed an order.',
      },
    });

    const waiter1Notifications = await inAppNotificationService.list('waiter-1', 'restaurant-1');
    expect(waiter1Notifications).toHaveLength(2);

    const unreadCount = await inAppNotificationService.unreadCount('waiter-1', 'restaurant-1');
    expect(unreadCount).toBe(2);

    await inAppNotificationService.markAsRead(waiter1Notifications[1]!.id, 'waiter-1');
    expect(await inAppNotificationService.unreadCount('waiter-1', 'restaurant-1')).toBe(1);

    await inAppNotificationService.markAllAsRead('waiter-1', 'restaurant-1');
    expect(await inAppNotificationService.unreadCount('waiter-1', 'restaurant-1')).toBe(0);

    await inAppNotificationService.delete(waiter1Notifications[0]!.id, 'waiter-1');
    expect(await inAppNotificationService.list('waiter-1', 'restaurant-1')).toHaveLength(1);

    const waiter2Notifications = await inAppNotificationService.list('waiter-2', 'restaurant-1');
    expect(waiter2Notifications).toHaveLength(1);
  });
});
