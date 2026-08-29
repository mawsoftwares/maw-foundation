import type { ITemplateStore, NotificationChannelValue, NotificationTemplate, TemplateVariable } from '@mawsoftwares/sdk';

export interface PgPool {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

interface TemplateRow {
  [key: string]: unknown;
  id: string;
  channel: string;
  name: string;
  subject: string | null;
  body: string;
  html: string | null;
  variables: TemplateVariable[] | null;
}

export class PgTemplateStore implements ITemplateStore {
  constructor(private readonly pool: PgPool) {}

  async get(templateId: string): Promise<NotificationTemplate | null> {
    const { rows } = await this.pool.query<TemplateRow>(
      `SELECT id, channel, name, subject, body, html, variables
       FROM notification_templates
       WHERE id = $1`,
      [templateId],
    );
    return rows.length > 0 ? this.toTemplate(rows[0]!) : null;
  }

  async list(channel?: NotificationChannelValue): Promise<readonly NotificationTemplate[]> {
    if (channel) {
      const { rows } = await this.pool.query<TemplateRow>(
        `SELECT id, channel, name, subject, body, html, variables
         FROM notification_templates
         WHERE channel = $1
         ORDER BY name`,
        [channel],
      );
      return rows.map(this.toTemplate);
    }

    const { rows } = await this.pool.query<TemplateRow>(
      `SELECT id, channel, name, subject, body, html, variables
       FROM notification_templates
       ORDER BY name`,
    );
    return rows.map(this.toTemplate);
  }

  async save(template: NotificationTemplate): Promise<void> {
    await this.pool.query(
      `INSERT INTO notification_templates (id, channel, name, subject, body, html, variables)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         channel = EXCLUDED.channel,
         name = EXCLUDED.name,
         subject = EXCLUDED.subject,
         body = EXCLUDED.body,
         html = EXCLUDED.html,
         variables = EXCLUDED.variables,
         updated_at = NOW()`,
      [
        template.id,
        template.channel,
        template.name,
        template.subject ?? null,
        template.body,
        template.html ?? null,
        template.variables ? JSON.stringify(template.variables) : null,
      ],
    );
  }

  async delete(templateId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM notification_templates WHERE id = $1`,
      [templateId],
    );
  }

  private toTemplate(row: TemplateRow): NotificationTemplate {
    return {
      id: row.id,
      channel: row.channel as NotificationChannelValue,
      name: row.name,
      subject: row.subject ?? undefined,
      body: row.body,
      html: row.html ?? undefined,
      variables: row.variables ?? undefined,
    };
  }
}
