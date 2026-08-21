export interface ITokenBlacklist {
  add(jti: string, expiresAt: number): Promise<void>;
  isBlacklisted(jti: string): Promise<boolean>;
}

export class MemoryTokenBlacklist implements ITokenBlacklist {
  private readonly store = new Map<string, number>();
  private cleanupTimer: ReturnType<typeof setInterval> | undefined;

  constructor(cleanupIntervalMs: number = 60_000) {
    if (cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => this.prune(), cleanupIntervalMs);
      if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
        this.cleanupTimer.unref();
      }
    }
  }

  async add(jti: string, expiresAt: number): Promise<void> {
    this.store.set(jti, expiresAt);
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const expiresAt = this.store.get(jti);
    if (expiresAt === undefined) return false;
    if (Date.now() > expiresAt * 1000) {
      this.store.delete(jti);
      return false;
    }
    return true;
  }

  destroy(): void {
    if (this.cleanupTimer !== undefined) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.store.clear();
  }

  private prune(): void {
    const nowSec = Math.floor(Date.now() / 1000);
    for (const [jti, expiresAt] of this.store) {
      if (nowSec > expiresAt) this.store.delete(jti);
    }
  }
}
