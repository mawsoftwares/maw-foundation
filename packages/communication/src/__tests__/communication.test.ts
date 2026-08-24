import { describe, expect, it, vi } from 'vitest';
import { MustacheTemplateRenderer, validateTemplateVariables } from '../template-renderer';
import { NotificationProviderRegistry } from '../provider-registry';
import { NotificationService } from '../notification-service';
import { ConsoleNotificationProvider } from '../providers/console-provider';
import { InMemoryInAppNotificationStore } from '../in-app-store';
import { NotificationChannel, DeliveryStatus, TemplateError, ProviderNotFoundError } from '@maw/sdk';

describe('MustacheTemplateRenderer', () => {
  const renderer = new MustacheTemplateRenderer();

  it('replaces simple variables', () => {
    const result = renderer.render('Hello {{name}}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('replaces nested variables', () => {
    const result = renderer.render('{{user.name}} from {{user.company}}', {
      user: { name: 'Alice', company: 'Acme' },
    });
    expect(result).toBe('Alice from Acme');
  });

  it('replaces missing variables with empty string', () => {
    const result = renderer.render('Hello {{name}}!', {});
    expect(result).toBe('Hello !');
  });

  it('handles multiple occurrences', () => {
    const result = renderer.render('{{x}} + {{x}} = {{y}}', { x: '1', y: '2' });
    expect(result).toBe('1 + 1 = 2');
  });

  it('handles whitespace in mustache tags', () => {
    const result = renderer.render('{{ name }}', { name: 'Bob' });
    expect(result).toBe('Bob');
  });
});

describe('validateTemplateVariables', () => {
  it('passes when all required vars present', () => {
    expect(() => validateTemplateVariables('', { name: 'X', email: 'x@y' }, ['name', 'email'])).not.toThrow();
  });

  it('throws TemplateError on missing required vars', () => {
    expect(() => validateTemplateVariables('', { name: 'X' }, ['name', 'email'])).toThrow(TemplateError);
  });

  it('does nothing when requiredVars is undefined', () => {
    expect(() => validateTemplateVariables('', {})).not.toThrow();
  });
});

describe('NotificationProviderRegistry', () => {
  it('registers and resolves a provider', () => {
    const registry = new NotificationProviderRegistry();
    const provider = new ConsoleNotificationProvider(NotificationChannel.EMAIL);
    registry.register(provider);
    expect(registry.resolve(NotificationChannel.EMAIL)).toBe(provider);
  });

  it('throws ProviderNotFoundError for unregistered channel', () => {
    const registry = new NotificationProviderRegistry();
    expect(() => registry.resolve(NotificationChannel.SMS)).toThrow(ProviderNotFoundError);
  });

  it('lists registered channels', () => {
    const registry = new NotificationProviderRegistry();
    const emailProvider = new ConsoleNotificationProvider(NotificationChannel.EMAIL);
    const smsProvider = new ConsoleNotificationProvider(NotificationChannel.SMS);
    registry.register(emailProvider);
    registry.register(smsProvider);
    expect(registry.channels()).toContain(NotificationChannel.EMAIL);
    expect(registry.channels()).toContain(NotificationChannel.SMS);
  });
});

describe('NotificationService', () => {
  it('sends a notification via the registered provider', async () => {
    const registry = new NotificationProviderRegistry();
    const provider = new ConsoleNotificationProvider(NotificationChannel.EMAIL);
    registry.register(provider);

    const service = new NotificationService({ registry });
    const result = await service.send({
      channel: NotificationChannel.EMAIL,
      metadata: { tenantId: 'tenant-1', correlationId: 'corr-1' },
      email: { to: 'test@example.com', subject: 'Hi', body: 'Hello' },
    });

    expect(result.status).toBe(DeliveryStatus.SENT);
    expect(result.channel).toBe(NotificationChannel.EMAIL);
  });

  it('returns FAILED for unregistered channel', async () => {
    const registry = new NotificationProviderRegistry();
    const service = new NotificationService({ registry });

    const result = await service.send({
      channel: NotificationChannel.PUSH,
      metadata: { tenantId: 'tenant-1' },
      push: { deviceTokens: ['tok'], title: 'X', body: 'Y' },
    });

    expect(result.status).toBe(DeliveryStatus.FAILED);
  });

  it('sends batch notifications', async () => {
    const registry = new NotificationProviderRegistry();
    registry.register(new ConsoleNotificationProvider(NotificationChannel.EMAIL));

    const service = new NotificationService({ registry });
    const results = await service.sendBatch([
      {
        channel: NotificationChannel.EMAIL,
        metadata: { tenantId: 't1' },
        email: { to: 'a@b.com', subject: 'A', body: 'A' },
      },
      {
        channel: NotificationChannel.EMAIL,
        metadata: { tenantId: 't1' },
        email: { to: 'c@d.com', subject: 'B', body: 'B' },
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]!.status).toBe(DeliveryStatus.SENT);
    expect(results[1]!.status).toBe(DeliveryStatus.SENT);
  });
});

describe('InMemoryInAppNotificationStore', () => {
  const makeNotification = (overrides: Partial<{ id: string; userId: string; tenantId: string; title: string }> = {}) => ({
    id: overrides.id ?? crypto.randomUUID(),
    userId: overrides.userId ?? 'u1',
    tenantId: overrides.tenantId ?? 't1',
    type: 'info',
    title: overrides.title ?? 'Hello',
    message: 'World',
    read: false,
    createdAt: new Date().toISOString(),
  });

  it('creates and lists notifications', async () => {
    const store = new InMemoryInAppNotificationStore();
    const notification = makeNotification();
    await store.create(notification);

    const list = await store.list('u1', 't1');
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe('Hello');
    expect(list[0]!.read).toBe(false);
  });

  it('lists notifications for correct user only', async () => {
    const store = new InMemoryInAppNotificationStore();
    await store.create(makeNotification({ userId: 'u1', title: 'A' }));
    await store.create(makeNotification({ userId: 'u2', title: 'B' }));
    await store.create(makeNotification({ userId: 'u1', title: 'C' }));

    const list = await store.list('u1', 't1');
    expect(list).toHaveLength(2);
  });

  it('marks notifications as read', async () => {
    const store = new InMemoryInAppNotificationStore();
    const n = makeNotification({ id: 'n-1' });
    await store.create(n);

    await store.markAsRead('n-1', 'u1');
    const list = await store.list('u1', 't1');
    expect(list[0]!.read).toBe(true);
  });
});
