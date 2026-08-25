import type { Logger, EventBus, IAuthorization } from '@maw/sdk';
import { createLogger } from '@maw/sdk';
import type { ExportFormatValue, ExportService } from '@maw/import-export';
import type { IQueueService } from '@maw/sdk/queue/contracts';
import type { IReportDefinitionRegistry, IReportDataSourceRegistry } from '../execution/registries';
import { ReportExecutor } from '../execution/report-executor';
import type { ReportRequest, ReportResult, ReportPreviewResult } from '../execution/types';
import type { IReportHistory, ReportRecord } from '../history/types';
import type { SavedReport, ISavedReportStore } from '../saved/types';
import type { ReportMetadata } from '../definition/metadata';
import { extractMetadata } from '../definition/metadata';
import { validateReportDefinition } from '../definition/validation';
import { validateReportRequest } from './validation';
import { ReportExportAdapter } from '../export/report-export-adapter';
import { toExportDefinition } from '../export/definition-mapper';
import { isComputedColumn } from '../definition/types';
import type { ComputedColumnDefinition } from '../definition/types';
import type { OperationContext } from '../types';
import { ReportStatus } from '../types';
import { ReportEvent } from '../events';
import { ReportNotFoundError, ReportAuthorizationError, DataSourceError, ReportError } from '../errors';
import { validateTransition } from '../state-machine';
import { REPORT_JOB_TYPE } from '../execution/report-worker';
import type { ReportJobData } from '../execution/report-worker';

const BACKGROUND_THRESHOLD = 10_000;

export interface ReportServiceOptions {
  readonly definitionRegistry: IReportDefinitionRegistry;
  readonly datasourceRegistry: IReportDataSourceRegistry;
  readonly history: IReportHistory;
  readonly authorization?: IAuthorization;
  readonly queueService?: IQueueService;
  readonly exportService?: ExportService;
  readonly savedReportStore?: ISavedReportStore;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

export class ReportService {
  private readonly definitionRegistry: IReportDefinitionRegistry;
  private readonly datasourceRegistry: IReportDataSourceRegistry;
  private readonly history: IReportHistory;
  private readonly authorization?: IAuthorization;
  private readonly queueService?: IQueueService;
  private readonly exportService?: ExportService;
  private readonly savedReportStore?: ISavedReportStore;
  private readonly eventBus?: EventBus;
  private readonly logger: Logger;
  private readonly executor: ReportExecutor;

  constructor(options: ReportServiceOptions) {
    this.definitionRegistry = options.definitionRegistry;
    this.datasourceRegistry = options.datasourceRegistry;
    this.history = options.history;
    this.authorization = options.authorization;
    this.queueService = options.queueService;
    this.exportService = options.exportService;
    this.savedReportStore = options.savedReportStore;
    this.eventBus = options.eventBus;
    this.logger = options.logger ?? createLogger('report-service');
    this.executor = new ReportExecutor({ logger: this.logger });
  }

  getMetadata(definitionName: string): ReportMetadata {
    const definition = this.definitionRegistry.get(definitionName);
    if (!definition) {
      throw new ReportNotFoundError(definitionName);
    }
    return extractMetadata(definition);
  }

  async preview(
    definitionName: string,
    request: ReportRequest,
    context: OperationContext,
  ): Promise<ReportPreviewResult> {
    const { definition, datasource } = this.resolveAndAuthorize(definitionName, context);
    validateReportRequest(request, definition, datasource);

    const result = await this.executor.execute(definition, request, datasource, context, { preview: true });
    return result as ReportPreviewResult;
  }

  async run(
    definitionName: string,
    request: ReportRequest,
    context: OperationContext,
  ): Promise<ReportResult | ReportRecord> {
    const { definition, datasource } = this.resolveAndAuthorize(definitionName, context);
    validateReportRequest(request, definition, datasource);

    const total = await datasource.count(request.filters, context);

    if (total >= BACKGROUND_THRESHOLD && this.queueService) {
      return this.enqueueReport(definitionName, request, context, total);
    }

    const result = await this.executor.execute(definition, request, datasource, context);

    if (this.eventBus) {
      await this.eventBus.emit(ReportEvent.REPORT_COMPLETED, {
        reportId: result.reportId,
        tenantId: context.tenantId,
        definitionName,
      });
    }

    return result;
  }

  async export(
    definitionName: string,
    request: ReportRequest,
    format: ExportFormatValue,
    context: OperationContext,
  ): Promise<{ exportId: string }> {
    if (!this.exportService) {
      throw new ReportError('Export service not configured');
    }

    const { definition, datasource } = this.resolveAndAuthorize(definitionName, context);
    validateReportRequest(request, definition, datasource);

    const computedColumns = definition.columns.filter(isComputedColumn) as ComputedColumnDefinition[];
    const sorting = request.sorting ?? definition.defaultSort;

    const adapter = new ReportExportAdapter(datasource, request.filters, sorting, computedColumns);
    const exportDef = toExportDefinition(definition, format, request.filters, sorting);

    const record = await this.exportService.createExport(exportDef, context);
    await this.exportService.processExport(record.id, exportDef, adapter);

    if (this.eventBus) {
      await this.eventBus.emit(ReportEvent.REPORT_EXPORTED, {
        reportId: record.id,
        tenantId: context.tenantId,
        definitionName,
      });
    }

    return { exportId: record.id };
  }

  async getStatus(reportId: string): Promise<ReportRecord> {
    const record = await this.history.get(reportId);
    if (!record) {
      throw new ReportNotFoundError(reportId);
    }
    return record;
  }

  async cancel(reportId: string): Promise<void> {
    const record = await this.history.get(reportId);
    if (!record) {
      throw new ReportNotFoundError(reportId);
    }

    validateTransition(record.status, ReportStatus.CANCELLED);

    await this.history.update(reportId, {
      status: ReportStatus.CANCELLED,
      completedAt: new Date().toISOString(),
    });

    if (this.eventBus) {
      await this.eventBus.emit(ReportEvent.REPORT_CANCELLED, {
        reportId,
        tenantId: record.tenantId,
        definitionName: record.definitionName,
      });
    }
  }

  async saveReport(
    input: Omit<SavedReport, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SavedReport> {
    if (!this.savedReportStore) {
      throw new ReportError('Saved report store not configured');
    }

    const now = new Date().toISOString();
    const saved: SavedReport = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    await this.savedReportStore.save(saved);
    return saved;
  }

  async listSavedReports(
    tenantId: string,
    definitionName?: string,
  ): Promise<readonly SavedReport[]> {
    if (!this.savedReportStore) {
      return [];
    }
    return this.savedReportStore.list(tenantId, definitionName);
  }

  async runSaved(
    savedReportId: string,
    context: OperationContext,
  ): Promise<ReportResult | ReportRecord> {
    if (!this.savedReportStore) {
      throw new ReportError('Saved report store not configured');
    }

    const saved = await this.savedReportStore.get(savedReportId);
    if (!saved) {
      throw new ReportNotFoundError(savedReportId);
    }

    return this.run(saved.definitionName, {
      definitionName: saved.definitionName,
      ...saved.request,
    }, context);
  }

  private resolveAndAuthorize(
    definitionName: string,
    context: OperationContext,
  ): { definition: ReturnType<IReportDefinitionRegistry['get']> & object; datasource: ReturnType<IReportDataSourceRegistry['get']> & object } {
    const definition = this.definitionRegistry.get(definitionName);
    if (!definition) {
      throw new ReportNotFoundError(definitionName);
    }

    validateReportDefinition(definition);

    if (definition.permission && this.authorization) {
      if (!this.authorization.can(definition.permission, { tenantId: context.tenantId })) {
        throw new ReportAuthorizationError(
          `Insufficient permission for report "${definitionName}": requires "${definition.permission}"`,
        );
      }
    }

    const datasource = this.datasourceRegistry.get(definitionName);
    if (!datasource) {
      throw new DataSourceError(`No datasource registered for report: "${definitionName}"`);
    }

    return { definition, datasource };
  }

  private async enqueueReport(
    definitionName: string,
    request: ReportRequest,
    context: OperationContext,
    totalRows: number,
  ): Promise<ReportRecord> {
    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();

    const record: ReportRecord = {
      id: reportId,
      tenantId: context.tenantId,
      userId: context.userId,
      definitionName,
      status: ReportStatus.QUEUED,
      createdAt: now,
      progress: { totalRows, processedRows: 0, percentage: 0 },
    };

    await this.history.create(record);

    const jobData: ReportJobData = {
      reportId,
      definitionName,
      request,
      tenantId: context.tenantId,
      userId: context.userId,
    };

    await this.queueService!.enqueue({
      type: REPORT_JOB_TYPE,
      data: jobData,
      context: {
        tenantId: context.tenantId,
        userId: context.userId,
        correlationId: context.correlationId,
      },
    });

    if (this.eventBus) {
      await this.eventBus.emit(ReportEvent.REPORT_QUEUED, {
        reportId,
        tenantId: context.tenantId,
        definitionName,
      });
    }

    this.logger.info('Report queued for background processing', {
      reportId,
      definitionName,
      totalRows,
    });

    return record;
  }
}
