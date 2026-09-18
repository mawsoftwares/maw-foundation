import type { INotificationProvider, NotificationRequest, NotificationResult } from '@mawsoftwares/sdk';
import { NotificationChannel, DeliveryStatus, createLogger } from '@mawsoftwares/sdk';

// A generic, configuration-driven SMS provider: works with any HTTP SMS
// gateway (Twilio-compatible, MSG91, a custom in-house gateway, etc.)
// without needing a bespoke client per vendor. The admin-managed "SMS
// Master" (see messaging_credentials) supplies baseUrl/apiKey/field names;
// this class just does the HTTP call and reports SENT/FAILED.
export interface HttpSmsProviderOptions {
  readonly baseUrl: string;
  readonly method?: 'GET' | 'POST';
  readonly apiKey?: string;
  readonly authHeader?: string;
  readonly authScheme?: string;
  readonly toField?: string;
  readonly messageField?: string;
  readonly extraParams?: Readonly<Record<string, string>>;
}

export class HttpSmsProvider implements INotificationProvider {
  readonly channel = NotificationChannel.SMS;
  readonly name = 'http-sms';
  private readonly logger = createLogger('provider:http-sms');

  constructor(private readonly options: HttpSmsProviderOptions) {}

  async send(request: NotificationRequest): Promise<NotificationResult> {
    const sms = request.sms;
    if (!sms) {
      throw new Error('SMS request payload is missing');
    }

    const toField = this.options.toField ?? 'to';
    const messageField = this.options.messageField ?? 'message';
    const method = this.options.method ?? 'POST';
    const params: Record<string, string> = {
      ...(this.options.extraParams ?? {}),
      [toField]: sms.to,
      [messageField]: sms.message,
    };

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.options.apiKey) {
      const scheme = this.options.authScheme ?? 'Bearer';
      const header = this.options.authHeader ?? 'authorization';
      headers[header] = header.toLowerCase() === 'authorization' ? `${scheme} ${this.options.apiKey}` : this.options.apiKey;
    }

    this.logger.info('Sending SMS via generic HTTP provider', { to: sms.to, tenantId: request.metadata.tenantId });

    try {
      let url = this.options.baseUrl;
      const init: RequestInit = { method, headers };
      if (method === 'GET') {
        const qs = new URLSearchParams(params).toString();
        url = `${url}${url.includes('?') ? '&' : '?'}${qs}`;
      } else {
        init.body = JSON.stringify(params);
      }

      const res = await fetch(url, init);
      const bodyText = await res.text();
      let providerResponse: unknown = bodyText;
      try {
        providerResponse = JSON.parse(bodyText);
      } catch {
        // non-JSON response — keep raw text
      }

      if (!res.ok) {
        const error = `SMS gateway responded with ${res.status}`;
        this.logger.error(error, { status: res.status, body: bodyText });
        return {
          id: request.id ?? crypto.randomUUID(),
          channel: this.channel,
          status: DeliveryStatus.FAILED,
          provider: this.name,
          error,
          sentAt: new Date().toISOString(),
          metadata: { providerResponse },
        };
      }

      return {
        id: request.id ?? crypto.randomUUID(),
        channel: this.channel,
        status: DeliveryStatus.SENT,
        provider: this.name,
        sentAt: new Date().toISOString(),
        metadata: { providerResponse },
      };
    } catch (err) {
      const error = (err as Error).message;
      this.logger.error('SMS send failed', { error });
      return {
        id: request.id ?? crypto.randomUUID(),
        channel: this.channel,
        status: DeliveryStatus.FAILED,
        provider: this.name,
        error,
        sentAt: new Date().toISOString(),
      };
    }
  }
}
