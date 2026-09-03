import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, and, count, desc } from 'drizzle-orm';
import type { IInAppNotificationStore, InAppNotification } from '@mawsoftwares/sdk';

export class PgInAppNotificationStore implements IInAppNotificationStore {
  constructor(private readonly db: DrizzleDb) {}

  async create(notification: InAppNotification): Promise<void> {
    await this.db.insert(schema.notifications).values({
      id: notification.id,
      userId: notification.userId,
      tenantId: notification.tenantId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data ? JSON.parse(JSON.stringify(notification.data)) : null,
      actionUrl: notification.actionUrl ?? null,
      read: notification.read,
      createdAt: new Date(notification.createdAt),
      readAt: notification.readAt ? new Date(notification.readAt) : null,
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.db
      .update(schema.notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(schema.notifications.id, notificationId), eq(schema.notifications.userId, userId)));
  }

  async markAllAsRead(userId: string, tenantId: string): Promise<void> {
    await this.db
      .update(schema.notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.tenantId, tenantId), eq(schema.notifications.read, false)));
  }

  async list(
    userId: string,
    tenantId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean },
  ): Promise<readonly InAppNotification[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const conditions = [eq(schema.notifications.userId, userId), eq(schema.notifications.tenantId, tenantId)];
    if (options?.unreadOnly) conditions.push(eq(schema.notifications.read, false));

    const rows = await this.db
      .select()
      .from(schema.notifications)
      .where(and(...conditions))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map(this.toNotification);
  }

  async unreadCount(userId: string, tenantId: string): Promise<number> {
    const rows = await this.db
      .select({ count: count() })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.tenantId, tenantId), eq(schema.notifications.read, false)));
    return rows[0]?.count ?? 0;
  }

  async delete(notificationId: string, userId: string): Promise<void> {
    await this.db
      .delete(schema.notifications)
      .where(and(eq(schema.notifications.id, notificationId), eq(schema.notifications.userId, userId)));
  }

  private toNotification(row: typeof schema.notifications.$inferSelect): InAppNotification {
    return {
      id: row.id,
      userId: row.userId,
      tenantId: row.tenantId,
      type: row.type,
      title: row.title,
      message: row.message,
      data: (row.data as Record<string, unknown>) ?? undefined,
      actionUrl: row.actionUrl ?? undefined,
      read: row.read,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? undefined,
    };
  }
}
