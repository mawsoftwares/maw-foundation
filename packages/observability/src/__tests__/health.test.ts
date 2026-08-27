import { describe, it, expect } from 'vitest';
import { createHealthCheckService } from '../health/enhanced-health';

describe('HealthCheckService', () => {
  it('reports healthy when no checks registered', async () => {
    const service = createHealthCheckService();
    service.markReady();
    const report = await service.runLiveness();
    expect(report.status).toBe('healthy');
    expect(report.checks).toHaveLength(0);
  });

  it('runs checks in parallel', async () => {
    const service = createHealthCheckService();
    service.markReady();
    const order: number[] = [];

    service.register('slow', async () => {
      await new Promise((r) => setTimeout(r, 50));
      order.push(1);
    });
    service.register('fast', async () => {
      order.push(2);
    });

    await service.runLiveness();
    expect(order[0]).toBe(2);
    expect(order[1]).toBe(1);
  });

  it('per-check timeout returns unhealthy for critical checks', async () => {
    const service = createHealthCheckService({ defaultTimeoutMs: 50 });
    service.markReady();

    service.register('stalling', async () => {
      await new Promise((r) => setTimeout(r, 200));
    }, { critical: true });

    const report = await service.runLiveness();
    expect(report.status).toBe('unhealthy');
    expect(report.checks[0]!.message).toContain('Timed out');
  });

  it('separates liveness and readiness checks', async () => {
    const service = createHealthCheckService();
    service.markReady();

    service.register('live-only', () => {}, { type: 'liveness' });
    service.register('ready-only', () => {}, { type: 'readiness' });
    service.register('both', () => {}, { type: 'both' });

    const liveness = await service.runLiveness();
    const readiness = await service.runReadiness();

    expect(liveness.checks.map((c) => c.name)).toEqual(['live-only', 'both']);
    expect(readiness.checks.map((c) => c.name)).toEqual(['ready-only', 'both']);
  });

  it('readiness returns unhealthy before markReady', async () => {
    const service = createHealthCheckService();
    service.register('db', () => {}, { type: 'readiness' });

    const report = await service.runReadiness();
    expect(report.status).toBe('unhealthy');
  });

  it('readiness returns healthy after markReady', async () => {
    const service = createHealthCheckService();
    service.register('db', () => {}, { type: 'readiness' });
    service.markReady();

    const report = await service.runReadiness();
    expect(report.status).toBe('healthy');
  });

  it('failed check is degraded when non-critical', async () => {
    const service = createHealthCheckService();
    service.markReady();

    service.register('optional', () => { throw new Error('nope'); }, { critical: false });

    const report = await service.runLiveness();
    expect(report.status).toBe('degraded');
    expect(report.checks[0]!.status).toBe('degraded');
  });

  it('includes uptime and timestamp', async () => {
    const service = createHealthCheckService();
    service.markReady();
    const report = await service.runLiveness();
    expect(report.uptime).toBeGreaterThanOrEqual(0);
    expect(report.timestamp).toBeTruthy();
  });
});
