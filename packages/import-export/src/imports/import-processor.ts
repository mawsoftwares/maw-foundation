import type { Logger } from '@mawsoftwares/sdk';
import { createLogger } from '@mawsoftwares/sdk';
import type { EventBus } from '@mawsoftwares/sdk';
import type {
  ImportDefinition,
  OperationContext,
  ImportProgress,
  RowError,
} from '../types';
import { ImportStatus, DuplicateStrategy, ErrorSeverity } from '../types';
import { ImportExportEvent } from '../events';
import type { ParsedRow } from '../parsers/types';
import { ColumnMapper } from '../mapping/mapper';
import { RowValidator } from '../validation/row-validator';
import { InFileDuplicateChecker } from '../duplicates/in-file-checker';
import type { IDuplicateChecker } from '../duplicates/types';
import { sanitizeRowValue } from '../security';
import type { IImportRowProcessor } from './types';
import type { IImportExportHistory } from '../history/types';

export interface ImportProcessorOptions {
  readonly definition: ImportDefinition;
  readonly context: OperationContext;
  readonly parsedRows: readonly ParsedRow[];
  readonly mapping: ReadonlyMap<string, string>;
  readonly processor: IImportRowProcessor;
  readonly history: IImportExportHistory;
  readonly importId: string;
  readonly externalDuplicateChecker?: IDuplicateChecker;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

export class ImportProcessor {
  private readonly mapper = new ColumnMapper();
  private readonly validator = new RowValidator();
  private readonly inFileChecker = new InFileDuplicateChecker();
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger('import-processor');
  }

  async process(opts: ImportProcessorOptions): Promise<ImportProgress> {
    const {
      definition,
      context,
      parsedRows,
      mapping,
      processor,
      history,
      importId,
      externalDuplicateChecker,
      eventBus,
    } = opts;

    const chunkSize = definition.chunkSize ?? 1000;
    const totalRows = parsedRows.length;
    let processedRows = 0;
    let successfulRows = 0;
    let failedRows = 0;
    let duplicateRows = 0;
    let skippedRows = 0;
    const allErrors: RowError[] = [];

    const mappedRows = parsedRows.map((row) => this.mapper.applyMapping(row, mapping, definition));

    const duplicateSet = new Set<number>();
    if (definition.duplicateKeys && definition.duplicateKeys.length > 0) {
      const inFileResult = await this.inFileChecker.check(mappedRows, definition.duplicateKeys);
      for (const d of inFileResult.duplicates) {
        duplicateSet.add(d.rowNumber - 1);
      }

      if (externalDuplicateChecker) {
        const externalResult = await externalDuplicateChecker.check(mappedRows, definition.duplicateKeys);
        for (const d of externalResult.duplicates) {
          duplicateSet.add(d.rowNumber - 1);
        }
      }
    }

    const strategy = definition.duplicateStrategy ?? DuplicateStrategy.REJECT;

    for (let offset = 0; offset < totalRows; offset += chunkSize) {
      const chunk = mappedRows.slice(offset, offset + chunkSize);

      for (let i = 0; i < chunk.length; i++) {
        const globalIndex = offset + i;
        const row = chunk[i]!;
        const rowNumber = globalIndex + 1;

        if (duplicateSet.has(globalIndex)) {
          duplicateRows++;
          if (strategy === DuplicateStrategy.REJECT) {
            failedRows++;
            allErrors.push({
              rowNumber,
              errorCode: 'DUPLICATE',
              message: `Duplicate row detected (keys: ${definition.duplicateKeys!.join(', ')})`,
              severity: ErrorSeverity.ERROR,
            });
            processedRows++;
            continue;
          }
          if (strategy === DuplicateStrategy.SKIP) {
            skippedRows++;
            processedRows++;
            continue;
          }
        }

        const validation = this.validator.validate(row, rowNumber, definition);
        if (!validation.valid) {
          failedRows++;
          allErrors.push(...validation.errors);
          processedRows++;
          continue;
        }

        try {
          await processor.processRow(row, context);
          successfulRows++;
        } catch (err) {
          failedRows++;
          allErrors.push({
            rowNumber,
            errorCode: 'PROCESSING_ERROR',
            message: err instanceof Error ? err.message : String(err),
            value: sanitizeRowValue(JSON.stringify(row), 200),
            severity: ErrorSeverity.ERROR,
          });
        }
        processedRows++;
      }

      const progress: ImportProgress = {
        totalRows,
        processedRows,
        successfulRows,
        failedRows,
        duplicateRows,
        skippedRows,
        percentage: Math.round((processedRows / totalRows) * 100),
      };

      if (eventBus) {
        await eventBus.emit(ImportExportEvent.IMPORT_PROGRESS, {
          importId,
          tenantId: context.tenantId,
          definitionName: definition.name,
          processedRows,
          totalRows,
          percentage: progress.percentage,
        });
      }

      const status = processedRows === totalRows
        ? failedRows > 0 ? ImportStatus.COMPLETED_WITH_ERRORS : ImportStatus.COMPLETED
        : ImportStatus.PROCESSING;

      await history.update(importId, {
        status,
        progress,
        ...(processedRows === totalRows ? { completedAt: new Date().toISOString() } : {}),
      });
    }

    const finalProgress: ImportProgress = {
      totalRows,
      processedRows,
      successfulRows,
      failedRows,
      duplicateRows,
      skippedRows,
      percentage: 100,
    };

    this.logger.info('Import processing complete', {
      importId,
      ...finalProgress,
    });

    return finalProgress;
  }
}
