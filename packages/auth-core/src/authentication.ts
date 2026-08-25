import { randomBytes } from 'node:crypto';
import { AccountStatus } from '@maw/sdk';
import type { DeviceInfo } from '@maw/sdk/contracts/identity';
import type { IUserRepository, UserRecord } from '@maw/sdk/contracts/IUserRepository';
import type { IHasher } from '@maw/sdk/contracts/IHasher';
import { hashToken } from './refresh';
import type { LoginProtection } from './login-protection';
import type { ILoginAttemptStore } from './login-attempt-store';
import type { SessionService, ServerSession } from './session-store';
import type { MfaService } from './otp';
import {
  AccountDisabledError,
  AccountLockedError,
  AccountPendingVerificationError,
  InvalidCredentialsError,
  InvalidOtpError,
  TokenExpiredError,
} from './auth-errors';

/**
 * A password login that passed credential checks but still owes a second factor. The
 * challenge token is handed to the client and exchanged for a session by
 * `completeMfaChallenge` — the password is never re-sent.
 */
export interface MfaChallengeRecord {
  readonly tokenHash: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly expiresAt: string;
  readonly rememberMe: boolean;
}

export interface IMfaChallengeStore {
  save(record: MfaChallengeRecord): Promise<void>;
  findByTokenHash(hash: string): Promise<MfaChallengeRecord | null>;
  delete(hash: string): Promise<void>;
}

export class MemoryMfaChallengeStore implements IMfaChallengeStore {
  private readonly records = new Map<string, MfaChallengeRecord>();

  async save(record: MfaChallengeRecord): Promise<void> {
    this.records.set(record.tokenHash, record);
  }

  async findByTokenHash(hash: string): Promise<MfaChallengeRecord | null> {
    return this.records.get(hash) ?? null;
  }

  async delete(hash: string): Promise<void> {
    this.records.delete(hash);
  }
}

export interface AuthenticateContext {
  readonly deviceInfo?: DeviceInfo;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly rememberMe?: boolean;
}

export interface AuthenticateInput extends AuthenticateContext {
  readonly tenantId: string;
  readonly email: string;
  readonly password: string;
}

export interface AuthenticationSuccess {
  readonly outcome: 'success';
  readonly user: UserRecord;
  readonly session: ServerSession;
}

export interface MfaChallengeIssued {
  readonly outcome: 'mfa_required';
  readonly user: UserRecord;
  readonly challengeToken: string;
  readonly expiresAt: string;
}

export type AuthenticateResult = AuthenticationSuccess | MfaChallengeIssued;

export interface AuthenticationServiceOptions {
  readonly userRepository: IUserRepository;
  readonly hasher: IHasher;
  readonly sessionService: SessionService;
  readonly loginProtection?: LoginProtection;
  /**
   * Durable login history. Kept separate from `LoginProtection`'s own optional store
   * because lockout counting clears its records on success, which would erase history.
   */
  readonly loginAttemptStore?: ILoginAttemptStore;
  readonly mfaService?: MfaService;
  readonly mfaChallengeStore?: IMfaChallengeStore;
  readonly mfaChallengeTtlSeconds?: number;
}

const DEFAULT_MFA_CHALLENGE_TTL_SECONDS = 300;

/**
 * The password login flow: lockout → credentials → account status → optional second
 * factor → session. It stops at the session; issuing access/refresh tokens and shaping
 * the response stays with the product, which knows its own claims and payload.
 */
export class AuthenticationService {
  private readonly userRepository: IUserRepository;
  private readonly hasher: IHasher;
  private readonly sessionService: SessionService;
  private readonly loginProtection?: LoginProtection;
  private readonly loginAttemptStore?: ILoginAttemptStore;
  private readonly mfaService?: MfaService;
  private readonly mfaChallengeStore?: IMfaChallengeStore;
  private readonly mfaChallengeTtlSeconds: number;
  private decoyHashPromise?: Promise<string>;

  constructor(options: AuthenticationServiceOptions) {
    this.userRepository = options.userRepository;
    this.hasher = options.hasher;
    this.sessionService = options.sessionService;
    this.loginProtection = options.loginProtection;
    this.loginAttemptStore = options.loginAttemptStore;
    this.mfaService = options.mfaService;
    this.mfaChallengeStore = options.mfaChallengeStore;
    this.mfaChallengeTtlSeconds = options.mfaChallengeTtlSeconds ?? DEFAULT_MFA_CHALLENGE_TTL_SECONDS;
  }

  async authenticate(input: AuthenticateInput): Promise<AuthenticateResult> {
    const key = attemptKey(input.tenantId, input.email);

    if (this.loginProtection?.isLocked(key) === true) {
      await this.recordAttempt(key, false, input, 'LOCKED_OUT');
      throw new AccountLockedError();
    }

    const user = await this.userRepository.findByEmail(input.tenantId, input.email);
    if (user === null) {
      // Verify against a throwaway hash so an unknown email costs the same as a
      // wrong password — otherwise response time leaks which emails are registered.
      await this.hasher.verify(input.password, await this.decoyHash());
      throw await this.credentialFailure(key, input, 'UNKNOWN_EMAIL');
    }

    if (!(await this.hasher.verify(input.password, user.passwordHash))) {
      throw await this.credentialFailure(key, input, 'BAD_PASSWORD');
    }

    await this.assertCanAuthenticate(user, key, input);

    if (user.mfaEnabled && this.mfaService !== undefined && this.mfaChallengeStore !== undefined) {
      const challenge = await this.issueMfaChallenge(this.mfaChallengeStore, user, input.rememberMe === true);
      return { outcome: 'mfa_required', user, ...challenge };
    }

    return this.completeLogin(user, key, input);
  }

  /** Exchange an MFA challenge token plus a TOTP or backup code for a session. */
  async completeMfaChallenge(
    challengeToken: string,
    code: string,
    context: AuthenticateContext = {},
  ): Promise<AuthenticationSuccess> {
    if (this.mfaService === undefined || this.mfaChallengeStore === undefined) {
      throw new Error('MFA is not configured');
    }

    const tokenHash = hashToken(challengeToken);
    const record = await this.mfaChallengeStore.findByTokenHash(tokenHash);
    if (record === null || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new TokenExpiredError('Invalid or expired MFA challenge');
    }

    const user = await this.userRepository.findById(record.userId);
    if (user === null) {
      await this.mfaChallengeStore.delete(tokenHash);
      throw new InvalidCredentialsError();
    }

    const key = attemptKey(user.tenantId, user.email);
    if (!(await this.mfaService.verify(user.id, code))) {
      this.loginProtection?.recordFailure(key);
      await this.recordAttempt(key, false, context, 'INVALID_OTP');
      throw new InvalidOtpError();
    }

    await this.mfaChallengeStore.delete(tokenHash);
    return this.completeLogin(user, key, { ...context, rememberMe: record.rememberMe });
  }

  private async issueMfaChallenge(
    store: IMfaChallengeStore,
    user: UserRecord,
    rememberMe: boolean,
  ): Promise<{ challengeToken: string; expiresAt: string }> {
    const challengeToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.mfaChallengeTtlSeconds * 1000).toISOString();
    await store.save({
      tokenHash: hashToken(challengeToken),
      userId: user.id,
      tenantId: user.tenantId,
      expiresAt,
      rememberMe,
    });
    return { challengeToken, expiresAt };
  }

  private async completeLogin(
    user: UserRecord,
    key: string,
    context: AuthenticateContext,
  ): Promise<AuthenticationSuccess> {
    this.loginProtection?.recordSuccess(key);

    const session = await this.sessionService.create(user.tenantId, user.id, {
      deviceInfo: context.deviceInfo,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      rememberMe: context.rememberMe,
    });

    const now = new Date().toISOString();
    await this.userRepository.updateLastLogin(user.id, now);
    await this.recordAttempt(key, true, context);

    return { outcome: 'success', user, session };
  }

  private async assertCanAuthenticate(
    user: UserRecord,
    key: string,
    context: AuthenticateContext,
  ): Promise<void> {
    if (user.accountStatus === AccountStatus.ACTIVE) return;

    await this.recordAttempt(key, false, context, user.accountStatus);
    switch (user.accountStatus) {
      case AccountStatus.PENDING_VERIFICATION:
        throw new AccountPendingVerificationError();
      case AccountStatus.LOCKED:
        throw new AccountLockedError();
      case AccountStatus.SUSPENDED:
        throw new AccountDisabledError('Account is suspended');
      default:
        throw new AccountDisabledError();
    }
  }

  private decoyHash(): Promise<string> {
    this.decoyHashPromise ??= Promise.resolve(this.hasher.hash(randomBytes(32).toString('hex')));
    return this.decoyHashPromise;
  }

  /** Records the failure and returns the error for the caller to throw. */
  private async credentialFailure(
    key: string,
    context: AuthenticateContext,
    reason: string,
  ): Promise<InvalidCredentialsError> {
    this.loginProtection?.recordFailure(key, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      failureReason: reason,
    });
    await this.recordAttempt(key, false, context, reason);
    return new InvalidCredentialsError();
  }

  private async recordAttempt(
    key: string,
    success: boolean,
    context: AuthenticateContext,
    failureReason?: string,
  ): Promise<void> {
    if (this.loginAttemptStore === undefined) return;
    await this.loginAttemptStore.record({
      key,
      timestamp: new Date().toISOString(),
      success,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      failureReason,
    });
  }
}

function attemptKey(tenantId: string, email: string): string {
  return `${tenantId}:${email.toLowerCase()}`;
}
