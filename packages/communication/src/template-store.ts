import type { ITemplateStore, NotificationChannelValue, NotificationTemplate } from '@mawsoftwares/sdk';

export class InMemoryTemplateStore implements ITemplateStore {
  private readonly templates = new Map<string, NotificationTemplate>();

  async get(templateId: string): Promise<NotificationTemplate | null> {
    return this.templates.get(templateId) ?? null;
  }

  async list(channel?: NotificationChannelValue): Promise<readonly NotificationTemplate[]> {
    const all = Array.from(this.templates.values());
    return channel ? all.filter((template) => template.channel === channel) : all;
  }

  async save(template: NotificationTemplate): Promise<void> {
    this.templates.set(template.id, template);
  }

  async delete(templateId: string): Promise<void> {
    this.templates.delete(templateId);
  }
}
