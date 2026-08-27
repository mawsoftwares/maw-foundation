import { pgCheck } from '@mawsoftwares/sdk/config/health';
import type { PgPool } from '../types';
import type { MigrationRunner } from '../migration/runner';

export { pgCheck };

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export async function poolHealthCheck(
  pool: PgPool & Partial<PoolStats>,
): Promise<HealthCheckResult> {
  try {
    await pool.query('SELECT 1');
    return {
      healthy: true,
      message: 'Pool is healthy',
      details: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
    };
  } catch (err) {
    return {
      healthy: false,
      message: `Pool health check failed: ${(err as Error).message}`,
    };
  }
}

export async function migrationHealthCheck(
  runner: MigrationRunner,
): Promise<HealthCheckResult> {
  try {
    const { pending } = await runner.status();
    if (pending.length > 0) {
      return {
        healthy: false,
        message: `${pending.length} pending migration(s)`,
        details: { pending: pending.map((m) => `${m.version}_${m.name}`) },
      };
    }

    const { valid, drifted } = await runner.verify();
    if (!valid) {
      return {
        healthy: false,
        message: `${drifted.length} migration(s) have checksum drift`,
        details: { drifted },
      };
    }

    return { healthy: true, message: 'All migrations applied and verified' };
  } catch (err) {
    return {
      healthy: false,
      message: `Migration health check failed: ${(err as Error).message}`,
    };
  }
}
