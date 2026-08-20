/**
 * Composable health-check builder — register checks, run them, get a report.
 * Framework-agnostic; wire the result into any HTTP handler.
 */

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface CheckResult {
  name: string;
  status: HealthStatus;
  message?: string;
  durationMs: number;
}

export interface HealthReport {
  status: HealthStatus;
  uptime: number;
  timestamp: string;
  checks: CheckResult[];
}

export type HealthCheckFn = () => Promise<void> | void;

interface RegisteredCheck {
  name: string;
  fn: HealthCheckFn;
  critical: boolean;
}

export interface HealthChecker {
  register(name: string, fn: HealthCheckFn, options?: { critical?: boolean }): void;
  run(): Promise<HealthReport>;
}

export function createHealthChecker(): HealthChecker {
  const checks: RegisteredCheck[] = [];
  const startTime = Date.now();

  return {
    register(name, fn, options) {
      checks.push({ name, fn, critical: options?.critical ?? true });
    },

    async run() {
      const results: CheckResult[] = [];

      for (const check of checks) {
        const t0 = Date.now();
        try {
          await check.fn();
          results.push({
            name: check.name,
            status: 'healthy',
            durationMs: Date.now() - t0,
          });
        } catch (err) {
          results.push({
            name: check.name,
            status: check.critical ? 'unhealthy' : 'degraded',
            message: err instanceof Error ? err.message : String(err),
            durationMs: Date.now() - t0,
          });
        }
      }

      let overall: HealthStatus = 'healthy';
      for (const r of results) {
        if (r.status === 'unhealthy') { overall = 'unhealthy'; break; }
        if (r.status === 'degraded') overall = 'degraded';
      }

      return {
        status: overall,
        uptime: Math.round((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
        checks: results,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Common check factories
// ---------------------------------------------------------------------------

export function pgCheck(pool: { query: (sql: string) => Promise<unknown> }): HealthCheckFn {
  return async () => { await pool.query('SELECT 1'); };
}

export function redisCheck(client: { ping: () => Promise<string> }): HealthCheckFn {
  return async () => {
    const reply = await client.ping();
    if (reply !== 'PONG') throw new Error(`Unexpected ping reply: ${reply}`);
  };
}

export function httpCheck(url: string, timeoutMs = 5000): HealthCheckFn {
  return async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } finally {
      clearTimeout(timer);
    }
  };
}
