export interface LoginAttemptRecord {
  readonly key: string;
  readonly timestamp: string;
  readonly success: boolean;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly failureReason?: string;
}

export interface ILoginAttemptStore {
  record(attempt: LoginAttemptRecord): Promise<void>;
  getRecentFailures(key: string, since: string): Promise<readonly LoginAttemptRecord[]>;
  clear(key: string): Promise<void>;
}

export class MemoryLoginAttemptStore implements ILoginAttemptStore {
  private readonly attempts = new Map<string, LoginAttemptRecord[]>();

  async record(attempt: LoginAttemptRecord): Promise<void> {
    const list = this.attempts.get(attempt.key) ?? [];
    list.push(attempt);
    this.attempts.set(attempt.key, list);
  }

  async getRecentFailures(key: string, since: string): Promise<readonly LoginAttemptRecord[]> {
    const list = this.attempts.get(key) ?? [];
    const sinceTime = new Date(since).getTime();
    return list.filter((a) => !a.success && new Date(a.timestamp).getTime() >= sinceTime);
  }

  async clear(key: string): Promise<void> {
    this.attempts.delete(key);
  }
}
