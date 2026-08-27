import nodemailer from 'nodemailer';
import type { INotificationProvider, NotificationRequest, NotificationResult } from '@mawsoftwares/sdk';
import { NotificationChannel, DeliveryStatus, createLogger } from '@mawsoftwares/sdk';

export interface SmtpProviderOptions {
  readonly host: string;
  readonly port: number;
  readonly secure?: boolean;
  readonly auth?: {
    readonly user: string;
    readonly pass: string;
  };
}

function asAddressList(value: string | readonly string[] | undefined): readonly string[] {
  if (value === undefined) return [];
  return typeof value === 'string' ? (value.length > 0 ? [value] : []) : [...value];
}

export class SmtpNotificationProvider implements INotificationProvider {
  readonly channel = NotificationChannel.EMAIL;
  readonly name = 'smtp';
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = createLogger('provider:smtp');

  constructor(options: SmtpProviderOptions) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure ?? options.port === 465,
      auth: options.auth,
    });
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    const email = request.email;
    if (!email) {
      throw new Error('Email request payload is missing');
    }
    if (!email.from) {
      throw new Error('Email "from" address is required');
    }

    const to = typeof email.to === 'string' ? email.to : [...email.to].join(', ');
    const cc = email.cc ? (typeof email.cc === 'string' ? email.cc : [...email.cc].join(', ')) : undefined;
    const bcc = email.bcc ? (typeof email.bcc === 'string' ? email.bcc : [...email.bcc].join(', ')) : undefined;

    this.logger.info('Sending real SMTP email', {
      to,
      subject: email.subject,
      tenantId: request.metadata.tenantId,
    });

    const info = await this.transporter.sendMail({
      from: email.from,
      to,
      ...(cc !== undefined ? { cc } : {}),
      ...(bcc !== undefined ? { bcc } : {}),
      subject: email.subject,
      text: email.body,
      ...(email.html !== undefined ? { html: email.html } : {}),
      ...(email.replyTo !== undefined ? { replyTo: email.replyTo } : {}),
    });

    const rejected = asAddressList(info.rejected);
    if (rejected.length > 0) {
      const error = `SMTP rejected recipient(s): ${rejected.join(', ')}`;
      this.logger.error(error, { to, response: info.response });
      return {
        id: request.id ?? crypto.randomUUID(),
        channel: this.channel,
        status: DeliveryStatus.FAILED,
        provider: this.name,
        providerMessageId: info.messageId,
        error,
        sentAt: new Date().toISOString(),
      };
    }

    return {
      id: request.id ?? crypto.randomUUID(),
      channel: this.channel,
      status: DeliveryStatus.SENT,
      provider: this.name,
      providerMessageId: info.messageId,
      sentAt: new Date().toISOString(),
    };
  }
}
