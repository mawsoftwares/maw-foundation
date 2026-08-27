import type { IRateLimiter, RateLimitConfig, RateLimitResult } from '@mawsoftwares/sdk/contracts/IRateLimiter';

interface Entry {
  timestamps: number[];
}

export class MemoryRateLimiter implements IRateLimiter {
  private readonly store = new Map<string, Entry>();
  private cleanupTimer: ReturnType<typeof setInterval> | undefined;

  constructor(cleanupIntervalMs: number = 60_000) {
    if (cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
      if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
        this.cleanupTimer.unref();
      }
    }
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
    const count = entry.timestamps.length;

    if (count >= config.maxRequests) {
      const oldest = entry.timestamps[0]!;
      const resetAt = oldest + config.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterMs: resetAt - now,
      };
    }

    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: config.maxRequests - count - 1,
      resetAt: now + config.windowMs,
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  destroy(): void {
    if (this.cleanupTimer !== undefined) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      const last = entry.timestamps[entry.timestamps.length - 1];
      if (entry.timestamps.length === 0 || (last !== undefined && last < now - 300_000)) {
        this.store.delete(key);
      }
    }
  }
}
