import type {
  HealthStatus,
  HealthReport,
  CheckResult,
  HealthCheckFn,
} from '@mawsoftwares/sdk/config/health';
export { pgCheck, redisCheck, httpCheck } from '@mawsoftwares/sdk/config/health';

export type HealthCheckType = 'liveness' | 'readiness' | 'both';

interface RegisteredCheck {
  name: string;
  fn: HealthCheckFn;
  critical: boolean;
  type: HealthCheckType;
}

export interface HealthCheckService {
  register(
    name: string,
    fn: HealthCheckFn,
    options?: { critical?: boolean; type?: HealthCheckType },
  ): void;
  runLiveness(): Promise<HealthReport>;
  runReadiness(): Promise<HealthReport>;
  markReady(): void;
  isReady(): boolean;
}

export function createHealthCheckService(options?: {
  defaultTimeoutMs?: number;
}): HealthCheckService {
  const checks: RegisteredCheck[] = [];
  const startTime = Date.now();
  const timeoutMs = options?.defaultTimeoutMs ?? 5000;
  let ready = false;

  async function runCheck(check: RegisteredCheck): Promise<CheckResult> {
    const t0 = Date.now();
    try {
      const result = await Promise.race([
        Promise.resolve(check.fn()).then(() => 'ok' as const),
        new Promise<'timeout'>((resolve) =>
          setTimeout(() => resolve('timeout'), timeoutMs),
        ),
      ]);

      if (result === 'timeout') {
        return {
          name: check.name,
          status: check.critical ? 'unhealthy' : 'degraded',
          message: `Timed out after ${timeoutMs}ms`,
          durationMs: Date.now() - t0,
        };
      }

      return {
        name: check.name,
        status: 'healthy',
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      return {
        name: check.name,
        status: check.critical ? 'unhealthy' : 'degraded',
        message: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - t0,
      };
    }
  }

  function computeOverall(results: CheckResult[]): HealthStatus {
    let overall: HealthStatus = 'healthy';
    for (const r of results) {
      if (r.status === 'unhealthy') return 'unhealthy';
      if (r.status === 'degraded') overall = 'degraded';
    }
    return overall;
  }

  async function runFiltered(type: 'liveness' | 'readiness'): Promise<HealthReport> {
    const filtered = checks.filter(
      (c) => c.type === type || c.type === 'both',
    );

    const results = await Promise.allSettled(filtered.map(runCheck));
    const checkResults: CheckResult[] = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : {
            name: filtered[i]!.name,
            status: 'unhealthy' as const,
            message: r.reason instanceof Error ? r.reason.message : String(r.reason),
            durationMs: 0,
          },
    );

    let status = computeOverall(checkResults);
    if (type === 'readiness' && !ready) {
      status = 'unhealthy';
    }

    return {
      status,
      uptime: Math.round((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks: checkResults,
    };
  }

  return {
    register(name, fn, opts) {
      checks.push({
        name,
        fn,
        critical: opts?.critical ?? true,
        type: opts?.type ?? 'both',
      });
    },
    runLiveness: () => runFiltered('liveness'),
    runReadiness: () => runFiltered('readiness'),
    markReady() { ready = true; },
    isReady() { return ready; },
  };
}
