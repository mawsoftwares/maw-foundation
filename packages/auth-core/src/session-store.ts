import { randomUUID } from 'node:crypto';
import type { DeviceInfo } from '@maw/sdk/contracts/identity';
import type { SessionConfig } from '@maw/sdk/security/SecurityConfig';

export interface ServerSession {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly deviceId: string | null;
  readonly deviceInfo: DeviceInfo | null;
  readonly refreshTokenHash: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: string;
  readonly lastActiveAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
}

export interface ISessionStore {
  create(session: ServerSession): Promise<void>;
  findById(sessionId: string): Promise<ServerSession | null>;
  findByUser(tenantId: string, userId: string): Promise<readonly ServerSession[]>;
  updateLastActive(sessionId: string, timestamp: string): Promise<void>;
  updateRefreshTokenHash(sessionId: string, hash: string): Promise<void>;
  revoke(sessionId: string, timestamp: string): Promise<void>;
  revokeAllForUser(tenantId: string, userId: string, exceptSessionId?: string): Promise<void>;
  deleteExpired(): Promise<number>;
}

export class MemorySessionStore implements ISessionStore {
  private readonly sessions = new Map<string, ServerSession>();

  async create(session: ServerSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async findById(sessionId: string): Promise<ServerSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async findByUser(tenantId: string, userId: string): Promise<readonly ServerSession[]> {
    const result: ServerSession[] = [];
    for (const s of this.sessions.values()) {
      if (s.tenantId === tenantId && s.userId === userId) result.push(s);
    }
    return result;
  }

  async updateLastActive(sessionId: string, timestamp: string): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (s) this.sessions.set(sessionId, { ...s, lastActiveAt: timestamp });
  }

  async updateRefreshTokenHash(sessionId: string, hash: string): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (s) this.sessions.set(sessionId, { ...s, refreshTokenHash: hash });
  }

  async revoke(sessionId: string, timestamp: string): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (s) this.sessions.set(sessionId, { ...s, revokedAt: timestamp });
  }

  async revokeAllForUser(tenantId: string, userId: string, exceptSessionId?: string): Promise<void> {
    const now = new Date().toISOString();
    for (const [id, s] of this.sessions) {
      if (s.tenantId === tenantId && s.userId === userId && id !== exceptSessionId && s.revokedAt === null) {
        this.sessions.set(id, { ...s, revokedAt: now });
      }
    }
  }

  async deleteExpired(): Promise<number> {
    const now = Date.now();
    let count = 0;
    for (const [id, s] of this.sessions) {
      if (new Date(s.expiresAt).getTime() < now) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }
}

export interface SessionServiceOptions {
  readonly store: ISessionStore;
  readonly config: SessionConfig;
}

export class SessionService {
  private readonly store: ISessionStore;
  private readonly config: SessionConfig;

  constructor(options: SessionServiceOptions) {
    this.store = options.store;
    this.config = options.config;
  }

  async create(
    tenantId: string,
    userId: string,
    options?: {
      deviceInfo?: DeviceInfo;
      ipAddress?: string;
      userAgent?: string;
      rememberMe?: boolean;
      refreshTokenHash?: string;
    },
  ): Promise<ServerSession> {
    await this.enforceMaxSessions(tenantId, userId);

    const now = new Date();
    const ttlSeconds = options?.rememberMe
      ? this.config.rememberMeTtlSeconds
      : this.config.sessionTtlSeconds;
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const session: ServerSession = {
      id: randomUUID(),
      tenantId,
      userId,
      deviceId: options?.deviceInfo?.deviceId ?? null,
      deviceInfo: options?.deviceInfo ?? null,
      refreshTokenHash: options?.refreshTokenHash ?? null,
      ipAddress: options?.ipAddress ?? null,
      userAgent: options?.userAgent ?? null,
      createdAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      revokedAt: null,
    };

    await this.store.create(session);
    return session;
  }

  async listForUser(tenantId: string, userId: string): Promise<readonly ServerSession[]> {
    const all = await this.store.findByUser(tenantId, userId);
    const now = Date.now();
    return all.filter((s) => s.revokedAt === null && new Date(s.expiresAt).getTime() > now);
  }

  async findById(sessionId: string): Promise<ServerSession | null> {
    return this.store.findById(sessionId);
  }

  async revoke(sessionId: string): Promise<void> {
    await this.store.revoke(sessionId, new Date().toISOString());
  }

  async revokeAll(tenantId: string, userId: string, exceptSessionId?: string): Promise<void> {
    await this.store.revokeAllForUser(tenantId, userId, exceptSessionId);
  }

  async touchLastActive(sessionId: string): Promise<void> {
    await this.store.updateLastActive(sessionId, new Date().toISOString());
  }

  async updateRefreshTokenHash(sessionId: string, hash: string): Promise<void> {
    await this.store.updateRefreshTokenHash(sessionId, hash);
  }

  private async enforceMaxSessions(tenantId: string, userId: string): Promise<void> {
    const active = await this.listForUser(tenantId, userId);
    if (active.length >= this.config.maxConcurrentSessions) {
      const sorted = [...active].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const toRevoke = sorted.slice(0, active.length - this.config.maxConcurrentSessions + 1);
      for (const s of toRevoke) {
        await this.store.revoke(s.id, new Date().toISOString());
      }
    }
  }
}
