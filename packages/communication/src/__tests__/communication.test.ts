import { describe, expect, it, vi } from 'vitest';
import { MustacheTemplateRenderer, validateTemplateVariables } from '../template-renderer';
import { NotificationProviderRegistry } from '../provider-registry';
import { NotificationService } from '../notification-service';
import { ConsoleNotificationProvider } from '../providers/console-provider';
import { InMemoryInAppNotificationStore } from '../in-app-store';
import { NotificationChannel, DeliveryStatus, TemplateError, ProviderNotFoundError } from '@mawsoftwares/sdk';
import { EmailService } from '../EmailService';
import { SmsService } from '../SmsService';
import { InAppNotificationService } from '../InAppNotificationService';
import { createCommunication } from '../factory';

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

describe('EmailService', () => {
  it('sends an email synchronously', async () => {
    const registry = new NotificationProviderRegistry();
    registry.register(new ConsoleNotificationProvider(NotificationChannel.EMAIL));
    const service = new NotificationService({ registry });
    const emailService = new EmailService({
      notificationService: service,
      defaultFrom: 'no-reply@example.com',
    });

    const result = await emailService.send({
      tenantId: 'tenant-1',
      email: {
        to: 'user@example.com',
        subject: 'Reset Password',
      },
    });

    expect(result.status).toBe(DeliveryStatus.SENT);
    expect(result.channel).toBe(NotificationChannel.EMAIL);
  });

  it('sends an email asynchronously without blocking', async () => {
    const registry = new NotificationProviderRegistry();
    registry.register(new ConsoleNotificationProvider(NotificationChannel.EMAIL));
    const service = new NotificationService({ registry });
    const spy = vi.spyOn(service, 'send');
    const emailService = new EmailService({
      notificationService: service,
      defaultFrom: 'no-reply@example.com',
    });

    emailService.sendAsync({
      tenantId: 'tenant-1',
      email: {
        to: 'user@example.com',
        subject: 'Reset Password Async',
      },
    });

    // Should return instantly, send is called but not awaited
    expect(spy).toHaveBeenCalled();
  });
});

describe('SmsService', () => {
  it('sends an SMS synchronously', async () => {
    const registry = new NotificationProviderRegistry();
    registry.register(new ConsoleNotificationProvider(NotificationChannel.SMS));
    const service = new NotificationService({ registry });
    const smsService = new SmsService({ notificationService: service });

    const result = await smsService.send({
      tenantId: 'tenant-1',
      sms: { to: '+15551234567', message: 'Your table is ready' },
    });

    expect(result.status).toBe(DeliveryStatus.SENT);
    expect(result.channel).toBe(NotificationChannel.SMS);
  });

  it('sends an SMS asynchronously without blocking', async () => {
    const registry = new NotificationProviderRegistry();
    registry.register(new ConsoleNotificationProvider(NotificationChannel.SMS));
    const service = new NotificationService({ registry });
    const spy = vi.spyOn(service, 'send');
    const smsService = new SmsService({ notificationService: service });

    smsService.sendAsync({
      tenantId: 'tenant-1',
      sms: { to: '+15551234567', message: 'Pickup ready' },
    });

    expect(spy).toHaveBeenCalled();
  });
});

describe('InAppNotificationService', () => {
  const makeService = () => {
    const registry = new NotificationProviderRegistry();
    registry.register(new ConsoleNotificationProvider(NotificationChannel.IN_APP));
    const notificationService = new NotificationService({ registry });
    const store = new InMemoryInAppNotificationStore();
    const inAppNotificationService = new InAppNotificationService({
      notificationService,
      store,
    });
    return { inAppNotificationService, notificationService };
  };

  it('sends and persists an in-app notification', async () => {
    const { inAppNotificationService } = makeService();

    const result = await inAppNotificationService.send({
      tenantId: 'tenant-1',
      inApp: {
        userId: 'u1',
        type: 'order',
        title: 'New Order',
        message: 'Table 5 placed an order',
      },
    });

    expect(result.status).toBe(DeliveryStatus.SENT);
    expect(result.channel).toBe(NotificationChannel.IN_APP);

    const list = await inAppNotificationService.list('u1', 'tenant-1');
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(result.id);
    expect(list[0]!.title).toBe('New Order');
    expect(list[0]!.read).toBe(false);
  });

  it('does not persist when delivery fails', async () => {
    const registry = new NotificationProviderRegistry();
    const notificationService = new NotificationService({ registry });
    const store = new InMemoryInAppNotificationStore();
    const inAppNotificationService = new InAppNotificationService({
      notificationService,
      store,
    });

    const result = await inAppNotificationService.send({
      tenantId: 'tenant-1',
      inApp: { userId: 'u1', type: 'info', title: 'X', message: 'Y' },
    });

    expect(result.status).toBe(DeliveryStatus.FAILED);
    expect(await inAppNotificationService.unreadCount('u1', 'tenant-1')).toBe(0);
  });

  it('marks notifications as read and reports unread count', async () => {
    const { inAppNotificationService } = makeService();

    const first = await inAppNotificationService.send({
      tenantId: 't1',
      inApp: { userId: 'u1', type: 'info', title: 'A', message: 'A' },
    });
    await inAppNotificationService.send({
      tenantId: 't1',
      inApp: { userId: 'u1', type: 'info', title: 'B', message: 'B' },
    });

    expect(await inAppNotificationService.unreadCount('u1', 't1')).toBe(2);

    await inAppNotificationService.markAsRead(first.id, 'u1');
    expect(await inAppNotificationService.unreadCount('u1', 't1')).toBe(1);

    await inAppNotificationService.markAllAsRead('u1', 't1');
    expect(await inAppNotificationService.unreadCount('u1', 't1')).toBe(0);
  });

  it('sends an in-app notification asynchronously without blocking', async () => {
    const { inAppNotificationService, notificationService } = makeService();
    const spy = vi.spyOn(notificationService, 'send');

    inAppNotificationService.sendAsync({
      tenantId: 'tenant-1',
      inApp: { userId: 'u1', type: 'info', title: 'Hi', message: 'There' },
    });

    expect(spy).toHaveBeenCalled();
  });
});

describe('createCommunication facades', () => {
  it('exposes email, SMS, and in-app facades', async () => {
    const { emailService, smsService, inAppNotificationService } = createCommunication();

    const email = await emailService.send({
      tenantId: 't1',
      email: { to: 'a@b.com', subject: 'Hi', body: 'Hello' },
    });
    const sms = await smsService.send({
      tenantId: 't1',
      sms: { to: '+15550001111', message: 'Hello' },
    });
    const inApp = await inAppNotificationService.send({
      tenantId: 't1',
      inApp: { userId: 'u1', type: 'info', title: 'Hi', message: 'Hello' },
    });

    expect(email.channel).toBe(NotificationChannel.EMAIL);
    expect(sms.channel).toBe(NotificationChannel.SMS);
    expect(inApp.channel).toBe(NotificationChannel.IN_APP);
    expect(await inAppNotificationService.list('u1', 't1')).toHaveLength(1);
  });
});

describe('SmtpNotificationProvider', () => {
  it('calls nodemailer to send real emails', async () => {
    const nodemailer = await import('nodemailer');
    const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-123' });
    vi.spyOn(nodemailer.default, 'createTransport').mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const { SmtpNotificationProvider } = await import('../providers/smtp-provider');
    const provider = new SmtpNotificationProvider({
      host: 'smtp.example.com',
      port: 587,
      auth: { user: 'user', pass: 'pass' },
    });

    const result = await provider.send({
      channel: NotificationChannel.EMAIL,
      metadata: { tenantId: 't1' },
      email: {
        to: 'recipient@example.com',
        subject: 'Real SMTP Test',
        body: 'Hello SMTP',
        from: 'sender@example.com',
      },
    });

    expect(result.status).toBe(DeliveryStatus.SENT);
    expect(result.providerMessageId).toBe('msg-123');
    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Real SMTP Test',
      text: 'Hello SMTP',
    });
  });

  it('returns FAILED when SMTP rejects recipients', async () => {
    const nodemailer = await import('nodemailer');
    const mockSendMail = vi.fn().mockResolvedValue({
      messageId: 'msg-rejected',
      rejected: ['nobody@invalid.test'],
    });
    vi.spyOn(nodemailer.default, 'createTransport').mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const { SmtpNotificationProvider } = await import('../providers/smtp-provider');
    const provider = new SmtpNotificationProvider({
      host: 'smtp.example.com',
      port: 587,
      auth: { user: 'user', pass: 'pass' },
    });

    const result = await provider.send({
      channel: NotificationChannel.EMAIL,
      metadata: { tenantId: 't1' },
      email: {
        to: 'nobody@invalid.test',
        subject: 'Reject me',
        body: 'Hello',
        from: 'sender@example.com',
      },
    });

    expect(result.status).toBe(DeliveryStatus.FAILED);
    expect(result.error).toContain('nobody@invalid.test');
  });
});

