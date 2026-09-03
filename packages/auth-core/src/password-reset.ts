import { randomBytes } from 'node:crypto';
import { type PasswordPolicyConfig, validatePassword, type PasswordResetConfig, type Logger } from '@mawsoftwares/sdk';
import type { IUserRepository } from '@mawsoftwares/sdk/contracts/IUserRepository';
import type { IHasher } from '@mawsoftwares/sdk/contracts/IHasher';
import { hashToken } from './refresh';
import { TokenExpiredError, TokenAlreadyUsedError, PasswordPolicyError } from './auth-errors';
import type { SessionService } from './session-store';
import type { IPasswordHistoryStore } from './password-history';
import { isPasswordInHistory } from './password-history';

export interface ResetRecord {
  readonly userId: string;
  readonly email: string;
  readonly tokenHash: string;
  readonly expiresAt: string;
  readonly usedAt: string | null;
}

export interface IPasswordResetStore {
  save(record: ResetRecord): Promise<void>;
  findByTokenHash(hash: string): Promise<ResetRecord | null>;
  deleteForUser(userId: string): Promise<void>;
}

export class MemoryPasswordResetStore implements IPasswordResetStore {
  private readonly records = new Map<string, ResetRecord>();

  async save(record: ResetRecord): Promise<void> {
    this.records.set(record.tokenHash, record);
  }

  async findByTokenHash(hash: string): Promise<ResetRecord | null> {
    return this.records.get(hash) ?? null;
  }

  async deleteForUser(userId: string): Promise<void> {
    for (const [hash, r] of this.records) {
      if (r.userId === userId) this.records.delete(hash);
    }
  }
}

export type SendResetEmail = (email: string, token: string) => Promise<void>;

export interface PasswordResetServiceOptions {
  readonly userRepository: IUserRepository;
  readonly hasher: IHasher;
  readonly passwordPolicy: PasswordPolicyConfig;
  readonly resetConfig: PasswordResetConfig;
  readonly store: IPasswordResetStore;
  readonly sendResetEmail?: SendResetEmail;
  readonly sessionService?: SessionService;
  readonly passwordHistoryStore?: IPasswordHistoryStore;
  readonly passwordHistoryCount?: number;
  readonly logger?: Logger;
}

export class PasswordResetService {
  private readonly userRepository: IUserRepository;
  private readonly hasher: IHasher;
  private readonly passwordPolicy: PasswordPolicyConfig;
  private readonly resetConfig: PasswordResetConfig;
  private readonly store: IPasswordResetStore;
  private readonly sendResetEmail?: SendResetEmail;
  private readonly sessionService?: SessionService;
  private readonly historyStore?: IPasswordHistoryStore;
  private readonly historyCount: number;
  private readonly logger?: Logger;

  constructor(options: PasswordResetServiceOptions) {
    this.userRepository = options.userRepository;
    this.hasher = options.hasher;
    this.passwordPolicy = options.passwordPolicy;
    this.resetConfig = options.resetConfig;
    this.store = options.store;
    this.sendResetEmail = options.sendResetEmail;
    this.sessionService = options.sessionService;
    this.historyStore = options.passwordHistoryStore;
    this.historyCount = options.passwordHistoryCount ?? 5;
    this.logger = options.logger;
  }

  async requestReset(tenantId: string, email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(tenantId, email);
    if (!user) {
      this.logger?.info('Password reset requested for non-existent email', { tenantId, email });
      return;
    }

    await this.store.deleteForUser(user.id);
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.resetConfig.ttlSeconds * 1000).toISOString();

    await this.store.save({
      userId: user.id,
      email: user.email,
      tokenHash: hashToken(token),
      expiresAt,
      usedAt: null,
    });

    if (this.sendResetEmail) {
      await this.sendResetEmail(user.email, token);
    }
  }

  async executeReset(token: string, newPassword: string): Promise<void> {
    const record = await this.store.findByTokenHash(hashToken(token));
    if (!record) {
      throw new TokenExpiredError('Invalid or expired reset token');
    }
    if (record.usedAt !== null) {
      throw new TokenAlreadyUsedError();
    }
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      throw new TokenExpiredError('Reset token has expired');
    }

    const policyErrors = validatePassword(newPassword, this.passwordPolicy);
    if (policyErrors.length > 0) {
      throw new PasswordPolicyError(policyErrors.map((e) => e.message));
    }

    if (this.historyStore) {
      const reused = await isPasswordInHistory(newPassword, record.userId, this.historyStore, this.hasher, this.historyCount);
      if (reused) {
        throw new PasswordPolicyError([`Password was used recently — choose a different one`]);
      }
    }

    const oldUser = await this.userRepository.findById(record.userId);
    const passwordHash = await this.hasher.hash(newPassword);
    await this.userRepository.updatePassword(record.userId, passwordHash);
    await this.store.save({ ...record, usedAt: new Date().toISOString() });

    if (this.historyStore && oldUser) {
      await this.historyStore.record(record.userId, oldUser.passwordHash);
    }

    const user = await this.userRepository.findById(record.userId);
    if (user && this.sessionService) {
      await this.sessionService.revokeAll(user.tenantId, user.id);
    }
  }
}
