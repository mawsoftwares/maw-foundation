import type { Logger, EventBus } from '@maw/sdk';
import { createLogger, sanitizeFilename } from '@maw/sdk';
import type {
  ExportDefinition,
  OperationContext,
  ImportExportRecord,
  ExportProgress,
} from '../types';
import { ExportStatus } from '../types';
import { ExportError, ProcessingError } from '../errors';
import { ImportExportEvent } from '../events';
import type { IFormatter } from '../formatters/types';
import { FormatterRegistry, createDefaultFormatters } from '../formatters/registry';
import type { IImportExportHistory } from '../history/types';
import type { IExportDataProvider } from './types';
import { ExportProcessor } from './export-processor';

export interface ExportServiceOptions {
  readonly history: IImportExportHistory;
  readonly formatterRegistry?: FormatterRegistry;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

export interface ExportResult {
  readonly exportId: string;
  readonly content: string;
  readonly progress: ExportProgress;
}

export class ExportService {
  private readonly history: IImportExportHistory;
  private readonly formatters: FormatterRegistry;
  private readonly eventBus: EventBus | null;
  private readonly logger: Logger;

  constructor(options: ExportServiceOptions) {
    this.history = options.history;
    this.formatters = options.formatterRegistry ?? createDefaultFormatters();
    this.eventBus = options.eventBus ?? null;
    this.logger = options.logger ?? createLogger('export-service');
  }

  async createExport(
    definition: ExportDefinition,
    context: OperationContext,
  ): Promise<ImportExportRecord> {
    const exportId = crypto.randomUUID();
    const fileName = sanitizeFilename(
      definition.fileName ?? `${definition.name}-export.${definition.format.toLowerCase()}`,
    );

    const record: ImportExportRecord = {
      id: exportId,
      tenantId: context.tenantId,
      userId: context.userId,
      type: 'EXPORT',
      format: definition.format,
      fileName,
      status: ExportStatus.PENDING,
      definitionName: definition.name,
      createdAt: new Date().toISOString(),
    };

    await this.history.create(record);
    this.logger.info('Export created', { exportId, definitionName: definition.name });

    if (this.eventBus) {
      await this.eventBus.emit(ImportExportEvent.EXPORT_CREATED, {
        exportId,
        tenantId: context.tenantId,
        definitionName: definition.name,
      });
    }

    return record;
  }

  async processExport(
    exportId: string,
    definition: ExportDefinition,
    provider: IExportDataProvider,
  ): Promise<ExportResult> {
    const record = await this.getRecord(exportId);

    if (record.status !== ExportStatus.PENDING) {
      throw new ExportError(`Export is not in PENDING status: ${record.status}`);
    }

    await this.history.update(exportId, {
      status: ExportStatus.PROCESSING,
      startedAt: new Date().toISOString(),
    });

    if (this.eventBus) {
      await this.eventBus.emit(ImportExportEvent.EXPORT_STARTED, {
        exportId,
        tenantId: record.tenantId,
        definitionName: definition.name,
      });
    }

    const formatter = this.formatters.resolve(definition.format);
    const processor = new ExportProcessor();

    try {
      const { content, progress } = await processor.process({
        definition,
        context: { tenantId: record.tenantId, userId: record.userId },
        provider,
        formatter,
        history: this.history,
        exportId,
        eventBus: this.eventBus ?? undefined,
        logger: this.logger,
      });

      await this.history.update(exportId, {
        status: ExportStatus.COMPLETED,
        progress,
        completedAt: new Date().toISOString(),
      });

      if (this.eventBus) {
        await this.eventBus.emit(ImportExportEvent.EXPORT_COMPLETED, {
          exportId,
          tenantId: record.tenantId,
          definitionName: definition.name,
        });
      }

      return { exportId, content, progress };
    } catch (err) {
      await this.history.update(exportId, {
        status: ExportStatus.FAILED,
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date().toISOString(),
      });

      if (this.eventBus) {
        await this.eventBus.emit(ImportExportEvent.EXPORT_FAILED, {
          exportId,
          tenantId: record.tenantId,
          definitionName: definition.name,
        });
      }

      throw new ProcessingError('Export processing failed', {
        exportId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async getStatus(exportId: string): Promise<ImportExportRecord> {
    return this.getRecord(exportId);
  }

  async cancel(exportId: string): Promise<void> {
    const record = await this.getRecord(exportId);

    if (record.status === ExportStatus.COMPLETED || record.status === ExportStatus.FAILED) {
      throw new ExportError(`Cannot cancel export in ${record.status} status`);
    }

    await this.history.update(exportId, {
      status: ExportStatus.CANCELLED,
      completedAt: new Date().toISOString(),
    });

    if (this.eventBus) {
      await this.eventBus.emit(ImportExportEvent.EXPORT_CANCELLED, {
        exportId,
        tenantId: record.tenantId,
        definitionName: record.definitionName,
      });
    }

    this.logger.info('Export cancelled', { exportId });
  }

  private async getRecord(exportId: string): Promise<ImportExportRecord> {
    const record = await this.history.get(exportId);
    if (!record) throw new ExportError(`Export not found: ${exportId}`);
    return record;
  }
}
