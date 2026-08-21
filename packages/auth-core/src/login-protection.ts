export interface LoginProtectionConfig {
  readonly maxAttempts: number;
  readonly lockoutDurationMs: number;
  readonly progressiveDelay: boolean;
}

export const DEFAULT_LOGIN_PROTECTION: LoginProtectionConfig = {
  maxAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000,
  progressiveDelay: true,
};

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

export interface FailureResult {
  readonly locked: boolean;
  readonly attemptsRemaining: number;
  readonly retryAfterMs?: number;
}

export class LoginProtection {
  private readonly config: LoginProtectionConfig;
  private readonly store = new Map<string, AttemptRecord>();

  constructor(config: Partial<LoginProtectionConfig> = {}) {
    this.config = { ...DEFAULT_LOGIN_PROTECTION, ...config };
  }

  recordFailure(key: string): FailureResult {
    const now = Date.now();
    let record = this.store.get(key);

    if (!record) {
      record = { count: 0, firstAttemptAt: now };
      this.store.set(key, record);
    }

    if (record.lockedUntil !== undefined && now < record.lockedUntil) {
      return {
        locked: true,
        attemptsRemaining: 0,
        retryAfterMs: record.lockedUntil - now,
      };
    }

    if (record.lockedUntil !== undefined && now >= record.lockedUntil) {
      record.count = 0;
      record.lockedUntil = undefined;
      record.firstAttemptAt = now;
    }

    record.count++;

    if (record.count >= this.config.maxAttempts) {
      record.lockedUntil = now + this.config.lockoutDurationMs;
      return {
        locked: true,
        attemptsRemaining: 0,
        retryAfterMs: this.config.lockoutDurationMs,
      };
    }

    const attemptsRemaining = this.config.maxAttempts - record.count;
    const retryAfterMs = this.config.progressiveDelay
      ? Math.min(1000 * Math.pow(2, record.count - 1), 30_000)
      : undefined;

    return { locked: false, attemptsRemaining, retryAfterMs };
  }

  recordSuccess(key: string): void {
    this.store.delete(key);
  }

  isLocked(key: string): boolean {
    const record = this.store.get(key);
    if (!record || record.lockedUntil === undefined) return false;
    if (Date.now() >= record.lockedUntil) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}
