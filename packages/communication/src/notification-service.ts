import type {
  INotificationService,
  INotificationProviderRegistry,
  ITemplateRenderer,
  ITemplateStore,
  NotificationRequest,
  NotificationResult,
  Logger,
} from '@mawsoftwares/sdk';
import { DeliveryStatus, NotificationError, createLogger } from '@mawsoftwares/sdk';

export interface NotificationServiceOptions {
  readonly registry: INotificationProviderRegistry;
  readonly templateRenderer?: ITemplateRenderer;
  readonly templateStore?: ITemplateStore;
  readonly logger?: Logger;
}

export class NotificationService implements INotificationService {
  private readonly registry: INotificationProviderRegistry;
  private readonly templateRenderer: ITemplateRenderer | null;
  private readonly templateStore: ITemplateStore | null;
  private readonly logger: Logger;

  constructor(options: NotificationServiceOptions) {
    this.registry = options.registry;
    this.templateRenderer = options.templateRenderer ?? null;
    this.templateStore = options.templateStore ?? null;
    this.logger = options.logger ?? createLogger('communication');
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    const { channel, metadata } = request;
    const requestId = request.id ?? crypto.randomUUID();

    this.logger.info('Sending notification', {
      channel,
      tenantId: metadata.tenantId,
      correlationId: metadata.correlationId,
      requestId,
    });

    try {
      const resolved = await this.resolveTemplates(request);
      const provider = this.registry.resolve(channel);

      const result = await provider.send(resolved);

      this.logger.info('Notification sent', {
        channel,
        provider: provider.name,
        status: result.status,
        requestId,
        providerMessageId: result.providerMessageId,
      });

      return { ...result, id: requestId };
    } catch (error) {
      this.logger.error('Notification failed', {
        channel,
        requestId,
        error: (error as Error).message,
      });

      if (error instanceof NotificationError) throw error;

      return {
        id: requestId,
        channel,
        status: DeliveryStatus.FAILED,
        error: (error as Error).message,
      };
    }
  }

  async sendBatch(requests: readonly NotificationRequest[]): Promise<readonly NotificationResult[]> {
    return Promise.all(requests.map((r) => this.send(r)));
  }

  private async resolveTemplates(request: NotificationRequest): Promise<NotificationRequest> {
    if (!this.templateRenderer || !this.templateStore) return request;

    const templateId = request.email?.templateId ?? request.sms?.templateId;
    if (!templateId) return request;

    const template = await this.templateStore.get(templateId);
    if (!template) return request;

    const variables = request.email?.templateVariables ?? request.sms?.templateVariables ?? {};
    const renderedBody = this.templateRenderer.render(template.body, variables);
    const renderedSubject = template.subject ? this.templateRenderer.render(template.subject, variables) : undefined;
    const renderedHtml = template.html ? this.templateRenderer.render(template.html, variables) : undefined;

    if (request.email) {
      return {
        ...request,
        email: {
          ...request.email,
          body: renderedBody,
          subject: renderedSubject ?? request.email.subject,
          html: renderedHtml ?? request.email.html,
        },
      };
    }

    if (request.sms) {
      return {
        ...request,
        sms: { ...request.sms, message: renderedBody },
      };
    }

    return request;
  }
}
