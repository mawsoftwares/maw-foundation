import { BackoffStrategy, DEFAULT_RETRY_POLICY, type RetryPolicy } from '@mawsoftwares/sdk';

export function computeDelay(policy: RetryPolicy, attempt: number): number {
  const { delayMs, backoff, maxDelayMs } = policy;

  let delay: number;
  switch (backoff) {
    case BackoffStrategy.FIXED:
      delay = delayMs;
      break;
    case BackoffStrategy.LINEAR:
      delay = delayMs * attempt;
      break;
    case BackoffStrategy.EXPONENTIAL:
      delay = delayMs * Math.pow(2, attempt - 1);
      break;
    default:
      delay = delayMs;
  }

  if (maxDelayMs !== undefined && delay > maxDelayMs) delay = maxDelayMs;
  return delay;
}

export function mergeRetryPolicy(partial?: Partial<RetryPolicy>): RetryPolicy {
  if (!partial) return DEFAULT_RETRY_POLICY;
  return {
    maxAttempts: partial.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts,
    delayMs: partial.delayMs ?? DEFAULT_RETRY_POLICY.delayMs,
    backoff: partial.backoff ?? DEFAULT_RETRY_POLICY.backoff,
    maxDelayMs: partial.maxDelayMs ?? DEFAULT_RETRY_POLICY.maxDelayMs,
  };
}

export function shouldRetry(attempts: number, maxAttempts: number): boolean {
  return attempts < maxAttempts;
}
