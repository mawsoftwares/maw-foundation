import type { Logger, EventBus } from '@maw/sdk';
import { createLogger } from '@maw/sdk';
import type {
  ExportDefinition,
  OperationContext,
  ExportProgress,
  ExportFieldDefinition,
} from '../types';
import { ExportStatus } from '../types';
import { ImportExportEvent } from '../events';
import type { IFormatter } from '../formatters/types';
import type { IExportDataProvider } from './types';
import type { IImportExportHistory } from '../history/types';

export interface ExportProcessorOptions {
  readonly definition: ExportDefinition;
  readonly context: OperationContext;
  readonly provider: IExportDataProvider;
  readonly formatter: IFormatter;
  readonly history: IImportExportHistory;
  readonly exportId: string;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

export class ExportProcessor {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger('export-processor');
  }

  async process(opts: ExportProcessorOptions): Promise<{ content: string; progress: ExportProgress }> {
    const {
      definition,
      context,
      provider,
      formatter,
      history,
      exportId,
      eventBus,
    } = opts;

    const chunkSize = definition.chunkSize ?? 1000;
    const filters = definition.filters ?? {};
    const totalRows = await provider.count(filters, context);

    await history.update(exportId, {
      status: ExportStatus.PROCESSING,
      progress: { totalRows, processedRows: 0, percentage: 0 },
    });

    const allRows: Record<string, unknown>[] = [];
    let processedRows = 0;

    for (let offset = 0; offset < totalRows; offset += chunkSize) {
      const rows = await provider.fetch(filters, offset, chunkSize, context);

      for (const row of rows) {
        allRows.push(this.applyTransforms(row, definition.fields));
      }

      processedRows += rows.length;
      const percentage = totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 100;

      const progress: ExportProgress = { totalRows, processedRows, percentage };

      await history.update(exportId, { progress });

      if (eventBus) {
        await eventBus.emit(ImportExportEvent.EXPORT_PROGRESS, {
          exportId,
          tenantId: context.tenantId,
          definitionName: definition.name,
          processedRows,
          totalRows,
          percentage,
        });
      }
    }

    const content = formatter.formatRows(allRows, definition.fields, { includeHeaders: true });
    const finalProgress: ExportProgress = {
      totalRows,
      processedRows: totalRows,
      percentage: 100,
    };

    this.logger.info('Export processing complete', { exportId, totalRows });

    return { content, progress: finalProgress };
  }

  private applyTransforms(
    row: Record<string, unknown>,
    fields: readonly ExportFieldDefinition[],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const field of fields) {
      let value = row[field.name];
      if (field.transform) {
        value = field.transform(value);
      }
      result[field.name] = value;
    }
    return result;
  }
}
