import type { RequestHandler } from 'express';
import type { HealthCheckService } from '../../health/enhanced-health.js';

export function createHealthEndpoints(health: HealthCheckService): {
  liveness: RequestHandler;
  readiness: RequestHandler;
} {
  return {
    liveness: async (_req, res) => {
      try {
        const report = await health.runLiveness();
        const status = report.status === 'unhealthy' ? 503 : 200;
        res.status(status).json(report);
      } catch {
        res.status(503).json({ status: 'unhealthy' });
      }
    },
    readiness: async (_req, res) => {
      try {
        const report = await health.runReadiness();
        const status = report.status === 'unhealthy' ? 503 : 200;
        res.status(status).json(report);
      } catch {
        res.status(503).json({ status: 'unhealthy' });
      }
    },
  };
}
