import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq } from 'drizzle-orm';
import type { ITemplateStore, NotificationChannelValue, NotificationTemplate, TemplateVariable } from '@mawsoftwares/sdk';

export class PgTemplateStore implements ITemplateStore {
  constructor(private readonly db: DrizzleDb) {}

  async get(templateId: string): Promise<NotificationTemplate | null> {
    const rows = await this.db
      .select()
      .from(schema.notificationTemplates)
      .where(eq(schema.notificationTemplates.id, templateId));
    return rows[0] ? this.toTemplate(rows[0]) : null;
  }

  async list(channel?: NotificationChannelValue): Promise<readonly NotificationTemplate[]> {
    const q = this.db.select().from(schema.notificationTemplates);
    const rows = channel
      ? await q.where(eq(schema.notificationTemplates.channel, channel)).orderBy(schema.notificationTemplates.name)
      : await q.orderBy(schema.notificationTemplates.name);
    return rows.map(this.toTemplate);
  }

  async save(template: NotificationTemplate): Promise<void> {
    await this.db
      .insert(schema.notificationTemplates)
      .values({
        id: template.id,
        channel: template.channel,
        name: template.name,
        subject: template.subject ?? null,
        body: template.body,
        html: template.html ?? null,
        variables: template.variables ? JSON.parse(JSON.stringify(template.variables)) : null,
      })
      .onConflictDoUpdate({
        target: schema.notificationTemplates.id,
        set: {
          channel: template.channel,
          name: template.name,
          subject: template.subject ?? null,
          body: template.body,
          html: template.html ?? null,
          variables: template.variables ? JSON.parse(JSON.stringify(template.variables)) : null,
          updatedAt: new Date(),
        },
      });
  }

  async delete(templateId: string): Promise<void> {
    await this.db.delete(schema.notificationTemplates).where(eq(schema.notificationTemplates.id, templateId));
  }

  private toTemplate(row: typeof schema.notificationTemplates.$inferSelect): NotificationTemplate {
    return {
      id: row.id,
      channel: row.channel as NotificationChannelValue,
      name: row.name,
      subject: row.subject ?? undefined,
      body: row.body,
      html: row.html ?? undefined,
      variables: (row.variables as TemplateVariable[]) ?? undefined,
    };
  }
}
