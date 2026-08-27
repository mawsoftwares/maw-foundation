import type { MiddlewareHandler } from 'hono';
import type { HealthCheckService } from '../../health/enhanced-health.js';

export function createHealthEndpoints(health: HealthCheckService): {
  liveness: MiddlewareHandler;
  readiness: MiddlewareHandler;
} {
  return {
    liveness: async (c) => {
      try {
        const report = await health.runLiveness();
        const status = report.status === 'unhealthy' ? 503 : 200;
        return c.json(report, status);
      } catch {
        return c.json({ status: 'unhealthy' }, 503);
      }
    },
    readiness: async (c) => {
      try {
        const report = await health.runReadiness();
        const status = report.status === 'unhealthy' ? 503 : 200;
        return c.json(report, status);
      } catch {
        return c.json({ status: 'unhealthy' }, 503);
      }
    },
  };
}
