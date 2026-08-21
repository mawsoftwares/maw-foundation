export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
  readonly retryAfterMs?: number;
}

export interface IRateLimiter {
  check(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}
