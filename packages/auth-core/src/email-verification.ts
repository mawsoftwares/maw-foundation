import { randomBytes } from 'node:crypto';
import { hashToken } from './refresh';
import { TokenExpiredError, TokenAlreadyUsedError } from './auth-errors';

export interface VerificationRecord {
  readonly userId: string;
  readonly email: string;
  readonly tokenHash: string;
  readonly expiresAt: string;
  readonly usedAt: string | null;
}

export interface IEmailVerificationStore {
  save(record: VerificationRecord): Promise<void>;
  findByTokenHash(hash: string): Promise<VerificationRecord | null>;
  deleteForUser(userId: string): Promise<void>;
}

export class MemoryEmailVerificationStore implements IEmailVerificationStore {
  private readonly records = new Map<string, VerificationRecord>();

  async save(record: VerificationRecord): Promise<void> {
    this.records.set(record.tokenHash, record);
  }

  async findByTokenHash(hash: string): Promise<VerificationRecord | null> {
    return this.records.get(hash) ?? null;
  }

  async deleteForUser(userId: string): Promise<void> {
    for (const [hash, r] of this.records) {
      if (r.userId === userId) this.records.delete(hash);
    }
  }
}

export interface EmailVerificationOptions {
  readonly store: IEmailVerificationStore;
  readonly ttlSeconds: number;
}

export class EmailVerification {
  private readonly store: IEmailVerificationStore;
  private readonly ttlSeconds: number;

  constructor(options: EmailVerificationOptions) {
    this.store = options.store;
    this.ttlSeconds = options.ttlSeconds;
  }

  async generate(userId: string, email: string): Promise<{ token: string; expiresAt: string }> {
    await this.store.deleteForUser(userId);
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000).toISOString();
    await this.store.save({
      userId,
      email,
      tokenHash: hashToken(token),
      expiresAt,
      usedAt: null,
    });
    return { token, expiresAt };
  }

  async verify(token: string): Promise<{ userId: string; email: string }> {
    const record = await this.store.findByTokenHash(hashToken(token));
    if (!record) {
      throw new TokenExpiredError('Invalid or expired verification token');
    }
    if (record.usedAt !== null) {
      throw new TokenAlreadyUsedError();
    }
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      throw new TokenExpiredError('Verification token has expired');
    }
    await this.store.save({ ...record, usedAt: new Date().toISOString() });
    return { userId: record.userId, email: record.email };
  }

  async resend(userId: string, email: string): Promise<{ token: string; expiresAt: string }> {
    return this.generate(userId, email);
  }
}
