import type { IInAppNotificationStore, InAppNotification } from '@maw/sdk';

export class InMemoryInAppNotificationStore implements IInAppNotificationStore {
  private readonly notifications: InAppNotification[] = [];

  async create(notification: InAppNotification): Promise<void> {
    this.notifications.push(notification);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const idx = this.notifications.findIndex((n) => n.id === notificationId && n.userId === userId);
    if (idx === -1) return;
    const existing = this.notifications[idx]!;
    this.notifications[idx] = { ...existing, read: true, readAt: new Date().toISOString() };
  }

  async markAllAsRead(userId: string, tenantId: string): Promise<void> {
    const now = new Date().toISOString();
    for (let i = 0; i < this.notifications.length; i++) {
      const n = this.notifications[i]!;
      if (n.userId === userId && n.tenantId === tenantId && !n.read) {
        this.notifications[i] = { ...n, read: true, readAt: now };
      }
    }
  }

  async list(
    userId: string,
    tenantId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean },
  ): Promise<readonly InAppNotification[]> {
    let filtered = this.notifications.filter((n) => n.userId === userId && n.tenantId === tenantId);
    if (options?.unreadOnly) filtered = filtered.filter((n) => !n.read);
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return filtered.slice(offset, offset + limit);
  }

  async unreadCount(userId: string, tenantId: string): Promise<number> {
    return this.notifications.filter((n) => n.userId === userId && n.tenantId === tenantId && !n.read).length;
  }

  async delete(notificationId: string, userId: string): Promise<void> {
    const idx = this.notifications.findIndex((n) => n.id === notificationId && n.userId === userId);
    if (idx !== -1) this.notifications.splice(idx, 1);
  }
}
