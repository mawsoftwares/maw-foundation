import type { Logger, EventBus } from '@maw/sdk';
import { createLogger } from '@maw/sdk';
import type { JobHandler, Job, JobResult } from '@maw/sdk/queue/types';
import type { IReportDefinitionRegistry, IReportDataSourceRegistry } from './registries';
import { ReportExecutor } from './report-executor';
import type { ReportRequest } from './types';
import type { IReportHistory } from '../history/types';
import { ReportStatus } from '../types';
import { ReportEvent } from '../events';
import { ReportNotFoundError, DataSourceError } from '../errors';

export const REPORT_JOB_TYPE = 'reporting.generate';

export interface ReportJobData {
  readonly reportId: string;
  readonly definitionName: string;
  readonly request: ReportRequest;
  readonly tenantId: string;
  readonly userId: string;
}

export function createReportWorker(deps: {
  definitionRegistry: IReportDefinitionRegistry;
  datasourceRegistry: IReportDataSourceRegistry;
  history: IReportHistory;
  eventBus?: EventBus;
  logger?: Logger;
}): JobHandler<ReportJobData, void> {
  const logger = deps.logger ?? createLogger('report-worker');
  const executor = new ReportExecutor({ logger });

  return async (job: Job<ReportJobData>): Promise<JobResult<void>> => {
    const { reportId, definitionName, request, tenantId, userId } = job.data;

    try {
      const definition = deps.definitionRegistry.get(definitionName);
      if (!definition) {
        throw new ReportNotFoundError(definitionName);
      }

      const datasource = deps.datasourceRegistry.get(definitionName);
      if (!datasource) {
        throw new DataSourceError(`No datasource registered for: ${definitionName}`);
      }

      await deps.history.update(reportId, {
        status: ReportStatus.PROCESSING,
        startedAt: new Date().toISOString(),
      });

      if (deps.eventBus) {
        await deps.eventBus.emit(ReportEvent.REPORT_STARTED, {
          reportId,
          tenantId,
          definitionName,
        });
      }

      const result = await executor.execute(
        definition,
        request,
        datasource,
        { tenantId, userId },
      );

      await deps.history.update(reportId, {
        status: ReportStatus.COMPLETED,
        completedAt: new Date().toISOString(),
        rowCount: result.total,
        executionTimeMs: result.executionTimeMs,
        progress: { totalRows: result.total, processedRows: result.total, percentage: 100 },
      });

      if (deps.eventBus) {
        await deps.eventBus.emit(ReportEvent.REPORT_COMPLETED, {
          reportId,
          tenantId,
          definitionName,
        });
      }

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('Report worker failed', { reportId, error: errorMsg });

      await deps.history.update(reportId, {
        status: ReportStatus.FAILED,
        completedAt: new Date().toISOString(),
        error: errorMsg,
      });

      if (deps.eventBus) {
        await deps.eventBus.emit(ReportEvent.REPORT_FAILED, {
          reportId,
          tenantId,
          definitionName,
        });
      }

      return { success: false, error: errorMsg, retryable: false };
    }
  };
}
