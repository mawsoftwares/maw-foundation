import type { IInAppNotificationStore, InAppNotification } from '@mawsoftwares/sdk';

export interface PgPool {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

interface NotificationRow {
  [key: string]: unknown;
  id: string;
  user_id: string;
  tenant_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
  read_at: string | null;
}

export class PgInAppNotificationStore implements IInAppNotificationStore {
  constructor(private readonly pool: PgPool) {}

  async create(notification: InAppNotification): Promise<void> {
    await this.pool.query(
      `INSERT INTO notifications (id, user_id, tenant_id, type, title, message, data, action_url, read, created_at, read_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        notification.id,
        notification.userId,
        notification.tenantId,
        notification.type,
        notification.title,
        notification.message,
        notification.data ? JSON.stringify(notification.data) : null,
        notification.actionUrl ?? null,
        notification.read,
        notification.createdAt,
        notification.readAt ?? null,
      ],
    );
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE notifications SET read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2`,
      [notificationId, userId],
    );
  }

  async markAllAsRead(userId: string, tenantId: string): Promise<void> {
    await this.pool.query(
      `UPDATE notifications SET read = TRUE, read_at = NOW() WHERE user_id = $1 AND tenant_id = $2 AND read = FALSE`,
      [userId, tenantId],
    );
  }

  async list(
    userId: string,
    tenantId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean },
  ): Promise<readonly InAppNotification[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const unreadClause = options?.unreadOnly ? ' AND read = FALSE' : '';

    const { rows } = await this.pool.query<NotificationRow>(
      `SELECT id, user_id, tenant_id, type, title, message, data, action_url, read, created_at::TEXT, read_at::TEXT
       FROM notifications
       WHERE user_id = $1 AND tenant_id = $2${unreadClause}
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, tenantId, limit, offset],
    );

    return rows.map(this.toNotification);
  }

  async unreadCount(userId: string, tenantId: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::TEXT AS count FROM notifications WHERE user_id = $1 AND tenant_id = $2 AND read = FALSE`,
      [userId, tenantId],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  async delete(notificationId: string, userId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [notificationId, userId],
    );
  }

  private toNotification(row: NotificationRow): InAppNotification {
    return {
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data ?? undefined,
      actionUrl: row.action_url ?? undefined,
      read: row.read,
      createdAt: row.created_at,
      readAt: row.read_at ?? undefined,
    };
  }
}
