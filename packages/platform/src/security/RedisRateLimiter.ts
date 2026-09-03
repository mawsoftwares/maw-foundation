import type { IRateLimiter, RateLimitConfig, RateLimitResult } from '@mawsoftwares/sdk/contracts/IRateLimiter';

export interface RedisLike {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
  pttl(key: string): Promise<number>;
  del(key: string | string[]): Promise<number>;
}

export class RedisRateLimiter implements IRateLimiter {
  private readonly prefix: string;

  constructor(
    private readonly redis: RedisLike,
    options?: { prefix?: string },
  ) {
    this.prefix = options?.prefix ?? 'rl:';
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const redisKey = `${this.prefix}${key}`;
    const count = await this.redis.incr(redisKey);

    if (count === 1) {
      await this.redis.pexpire(redisKey, config.windowMs);
    }

    const ttl = await this.redis.pttl(redisKey);
    const resetAt = Date.now() + Math.max(ttl, 0);
    const remaining = Math.max(config.maxRequests - count, 0);
    const allowed = count <= config.maxRequests;

    return {
      allowed,
      remaining,
      resetAt,
      retryAfterMs: allowed ? undefined : Math.max(ttl, 0),
    };
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}${key}`);
  }
}
