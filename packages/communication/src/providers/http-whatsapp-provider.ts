import type { INotificationProvider, NotificationRequest, NotificationResult } from '@mawsoftwares/sdk';
import { NotificationChannel, DeliveryStatus, createLogger } from '@mawsoftwares/sdk';

// Ported from servicemate's shared/utils/whatsapp.ts: normalizes a phone
// number to digits-only (msisdn, no leading "+") and builds a wa.me deep
// link. Used as the zero-config "link mode" fallback for WhatsApp — no
// Business API credentials required, matches servicemate's default behavior.
export function normalizeWhatsAppPhone(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

export function buildWaMeUrl(phone: string, message: string): string {
  const digits = normalizeWhatsAppPhone(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// A generic, configuration-driven WhatsApp provider with two modes:
//  - 'link' (default): generates a wa.me deep link only — no real API call,
//    matching servicemate's actual behavior (it never had a real WhatsApp
//    Business API integration, only link generation).
//  - 'api': posts to any HTTP WhatsApp Business API-compatible endpoint
//    (Meta Cloud API, a BSP like Gupshup, or an in-house gateway) using the
//    admin-configured baseUrl/apiKey from the "WhatsApp Master".
export interface HttpWhatsAppProviderOptions {
  readonly mode?: 'link' | 'api';
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly authHeader?: string;
  readonly authScheme?: string;
  readonly toField?: string;
  readonly messageField?: string;
  readonly extraParams?: Readonly<Record<string, string>>;
}

export class HttpWhatsAppProvider implements INotificationProvider {
  readonly channel = NotificationChannel.WHATSAPP;
  readonly name = 'http-whatsapp';
  private readonly logger = createLogger('provider:http-whatsapp');

  constructor(private readonly options: HttpWhatsAppProviderOptions = {}) {}

  async send(request: NotificationRequest): Promise<NotificationResult> {
    const whatsApp = request.whatsApp;
    if (!whatsApp) {
      throw new Error('WhatsApp request payload is missing');
    }
    // Reuse templateId as the rendered message body — the caller (messaging
    // routes) renders the template first and passes the final text here.
    const message = whatsApp.templateId;

    if ((this.options.mode ?? 'link') === 'link' || !this.options.baseUrl) {
      const url = buildWaMeUrl(whatsApp.to, message);
      this.logger.info('Built wa.me link (no API credentials configured)', { to: whatsApp.to });
      return {
        id: request.id ?? crypto.randomUUID(),
        channel: this.channel,
        status: DeliveryStatus.SENT,
        provider: 'wa.me-link',
        providerMessageId: url,
        sentAt: new Date().toISOString(),
        metadata: { url, mode: 'link' },
      };
    }

    const toField = this.options.toField ?? 'to';
    const messageField = this.options.messageField ?? 'message';
    const params: Record<string, string> = {
      ...(this.options.extraParams ?? {}),
      [toField]: normalizeWhatsAppPhone(whatsApp.to),
      [messageField]: message,
    };
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.options.apiKey) {
      const scheme = this.options.authScheme ?? 'Bearer';
      const header = this.options.authHeader ?? 'authorization';
      headers[header] = header.toLowerCase() === 'authorization' ? `${scheme} ${this.options.apiKey}` : this.options.apiKey;
    }

    this.logger.info('Sending WhatsApp message via HTTP API', { to: whatsApp.to, tenantId: request.metadata.tenantId });

    try {
      const res = await fetch(this.options.baseUrl, { method: 'POST', headers, body: JSON.stringify(params) });
      const bodyText = await res.text();
      let providerResponse: unknown = bodyText;
      try {
        providerResponse = JSON.parse(bodyText);
      } catch {
        // non-JSON response — keep raw text
      }

      if (!res.ok) {
        const error = `WhatsApp API responded with ${res.status}`;
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
        metadata: { providerResponse, mode: 'api' },
      };
    } catch (err) {
      const error = (err as Error).message;
      this.logger.error('WhatsApp send failed', { error });
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
