import { createHash, randomBytes } from 'node:crypto';

/**
 * Refresh tokens: long-lived, rotated on every use, and stored only as a SHA-256 hash
 * (a leaked DB never yields a usable token). Ported from Restaurant OS `refresh.ts`, but
 * the storage is behind a port (`IRefreshTokenStore`) instead of Kysely, so it works with
 * Knex, Kysely, Postgres, or an in-memory store — the DB is the product's choice.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface RefreshRecord {
  readonly tenantId: string;
  readonly userId: string;
  readonly deviceId: string | null;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

/** Storage port for refresh tokens. Implemented per product (Postgres, in-memory, …). */
export interface IRefreshTokenStore {
  save(record: RefreshRecord): Promise<void>;
  find(tokenHash: string): Promise<RefreshRecord | null>;
  revoke(tokenHash: string): Promise<void>;
}

export interface RotatedToken {
  readonly tenantId: string;
  readonly userId: string;
  readonly deviceId: string | null;
  readonly token: string;
}

export class RefreshTokens {
  constructor(
    private readonly store: IRefreshTokenStore,
    private readonly ttlSeconds: number,
    private readonly now: () => number = Date.now,
  ) {}

  async issue(tenantId: string, userId: string, deviceId?: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.store.save({
      tenantId,
      userId,
      deviceId: deviceId ?? null,
      tokenHash: hashToken(token),
      expiresAt: new Date(this.now() + this.ttlSeconds * 1000),
      revokedAt: null,
    });
    return token;
  }

  /**
   * Verify a refresh token and rotate it: the presented token is revoked and a new one
   * issued. Returns null if the token is unknown, already revoked, or expired.
   */
  async rotate(presented: string): Promise<RotatedToken | null> {
    const row = await this.store.find(hashToken(presented));
    if (row === null || row.revokedAt !== null || row.expiresAt.getTime() < this.now()) {
      return null;
    }
    await this.store.revoke(row.tokenHash);
    const token = await this.issue(row.tenantId, row.userId, row.deviceId ?? undefined);
    return { tenantId: row.tenantId, userId: row.userId, deviceId: row.deviceId, token };
  }

  async revoke(presented: string): Promise<void> {
    await this.store.revoke(hashToken(presented));
  }
}
