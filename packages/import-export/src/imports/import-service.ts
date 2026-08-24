import type { Logger, EventBus } from '@maw/sdk';
import { createLogger, sanitizeFilename } from '@maw/sdk';
import type {
  ImportDefinition,
  OperationContext,
  ImportExportRecord,
  ImportPreview,
  ImportProgress,
  RowError,
} from '../types';
import { ImportStatus, type ImportFormatValue, type ImportStatusValue } from '../types';
import { ImportError, ProcessingError } from '../errors';
import { ImportExportEvent } from '../events';
import type { ParseResult } from '../parsers/types';
import { ParserRegistry, createDefaultParsers } from '../parsers/registry';
import { FileValidator } from '../validation/file-validator';
import { ColumnMapper } from '../mapping/mapper';
import { RowValidator } from '../validation/row-validator';
import { InFileDuplicateChecker } from '../duplicates/in-file-checker';
import type { IDuplicateChecker } from '../duplicates/types';
import type { MappingConfig } from '../mapping/types';
import type { IImportExportHistory } from '../history/types';
import { validateTransition } from './state-machine';
import { ImportProcessor } from './import-processor';
import type { IImportRowProcessor } from './types';

export interface ImportServiceOptions {
  readonly history: IImportExportHistory;
  readonly parserRegistry?: ParserRegistry;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

interface ParsedImportData {
  readonly parseResult: ParseResult;
  readonly mapping: ReadonlyMap<string, string>;
  readonly definition: ImportDefinition;
}

export class ImportService {
  private readonly history: IImportExportHistory;
  private readonly parsers: ParserRegistry;
  private readonly fileValidator = new FileValidator();
  private readonly mapper = new ColumnMapper();
  private readonly rowValidator = new RowValidator();
  private readonly inFileChecker = new InFileDuplicateChecker();
  private readonly eventBus: EventBus | null;
  private readonly logger: Logger;
  private readonly parsedCache = new Map<string, ParsedImportData>();

  constructor(options: ImportServiceOptions) {
    this.history = options.history;
    this.parsers = options.parserRegistry ?? createDefaultParsers();
    this.eventBus = options.eventBus ?? null;
    this.logger = options.logger ?? createLogger('import-service');
  }

  async createImport(
    fileName: string,
    fileSize: number,
    fileData: string | Buffer,
    definition: ImportDefinition,
    context: OperationContext,
    fileRef?: string,
  ): Promise<ImportExportRecord> {
    const format = this.fileValidator.validate(fileName, fileSize, definition);
    const importId = crypto.randomUUID();

    const record: ImportExportRecord = {
      id: importId,
      tenantId: context.tenantId,
      userId: context.userId,
      type: 'IMPORT',
      format,
      fileName: sanitizeFilename(fileName),
      status: ImportStatus.UPLOADED,
      definitionName: definition.name,
      createdAt: new Date().toISOString(),
      fileRef,
    };

    await this.history.create(record);

    this.logger.info('Import created', { importId, fileName, format, tenantId: context.tenantId });

    if (this.eventBus) {
      await this.eventBus.emit(ImportExportEvent.IMPORT_CREATED, {
        importId,
        tenantId: context.tenantId,
        definitionName: definition.name,
      });
    }

    const parseResult = await this.parseFile(importId, fileData, format);

    this.parsedCache.set(importId, { parseResult, mapping: new Map(), definition });

    return (await this.history.get(importId))!;
  }

  async parseAndPreview(
    importId: string,
    definition: ImportDefinition,
    mappingConfig?: MappingConfig,
    fileData?: string | Buffer,
  ): Promise<ImportPreview> {
    const record = await this.getRecord(importId);
    validateTransition(record.status as ImportStatusValue, ImportStatus.PARSING);
    await this.history.update(importId, { status: ImportStatus.PARSING });

    let parseResult: ParseResult;
    const cached = this.parsedCache.get(importId);
    if (cached) {
      parseResult = cached.parseResult;
    } else if (fileData) {
      const parser = this.parsers.resolve(record.format as ImportFormatValue);
      parseResult = await parser.parse(fileData);
    } else {
      throw new ImportError('No parsed data available. Provide fileData or create a new import.');
    }

    const mappingResult = this.mapper.mapColumns(
      parseResult.headers as string[],
      definition,
      mappingConfig,
    );

    const maxPreview = definition.maxPreviewRows ?? 100;
    const previewRows = parseResult.rows.slice(0, maxPreview);
    const mappedPreview = previewRows.map((row) =>
      this.mapper.applyMapping(row, mappingResult.mapped, definition),
    );

    const errors: RowError[] = [];
    let invalidRows = 0;
    for (let i = 0; i < mappedPreview.length; i++) {
      const result = this.rowValidator.validate(mappedPreview[i]!, i + 1, definition);
      if (!result.valid) {
        invalidRows++;
        errors.push(...result.errors);
      }
    }

    let duplicateRows = 0;
    if (definition.duplicateKeys && definition.duplicateKeys.length > 0) {
      const allMapped = parseResult.rows.map((row) =>
        this.mapper.applyMapping(row, mappingResult.mapped, definition),
      );
      const dupResult = await this.inFileChecker.check(allMapped, definition.duplicateKeys);
      duplicateRows = dupResult.duplicateCount;
    }

    const warnings: string[] = [];
    if (mappingResult.unmappedColumns.length > 0) {
      warnings.push(`Unmapped columns will be ignored: ${mappingResult.unmappedColumns.join(', ')}`);
    }
    if (mappingResult.missingRequiredFields.length > 0) {
      warnings.push(`Missing required fields: ${mappingResult.missingRequiredFields.join(', ')}`);
    }

    const scaledInvalidRows = parseResult.totalRows > maxPreview
      ? Math.round((invalidRows / maxPreview) * parseResult.totalRows)
      : invalidRows;
    const scaledValidRows = parseResult.totalRows - scaledInvalidRows - duplicateRows;

    this.parsedCache.set(importId, { parseResult, mapping: mappingResult.mapped, definition });
    await this.history.update(importId, { status: ImportStatus.PREVIEW_READY });

    if (this.eventBus) {
      await this.eventBus.emit(ImportExportEvent.IMPORT_PREVIEW_READY, {
        importId,
        tenantId: record.tenantId,
        definitionName: definition.name,
      });
    }

    return {
      totalRows: parseResult.totalRows,
      validRows: scaledValidRows,
      invalidRows: scaledInvalidRows,
      duplicateRows,
      sampleRows: mappedPreview.slice(0, 10),
      mapping: mappingResult.mapped,
      unmappedColumns: mappingResult.unmappedColumns,
      missingRequiredFields: mappingResult.missingRequiredFields,
      errors: errors.slice(0, 100),
      warnings,
    };
  }

  async confirmAndProcess(
    importId: string,
    processor: IImportRowProcessor,
    externalDuplicateChecker?: IDuplicateChecker,
  ): Promise<ImportProgress> {
    const record = await this.getRecord(importId);
    validateTransition(record.status as ImportStatusValue, ImportStatus.PROCESSING);

    const cached = this.parsedCache.get(importId);
    if (!cached) {
      throw new ImportError('Import must be previewed before processing');
    }

    await this.history.update(importId, {
      status: ImportStatus.PROCESSING,
      startedAt: new Date().toISOString(),
    });

    if (this.eventBus) {
      await this.eventBus.emit(ImportExportEvent.IMPORT_STARTED, {
        importId,
        tenantId: record.tenantId,
        definitionName: cached.definition.name,
      });
    }

    const importProcessor = new ImportProcessor();
    try {
      const progress = await importProcessor.process({
        definition: cached.definition,
        context: { tenantId: record.tenantId, userId: record.userId },
        parsedRows: cached.parseResult.rows,
        mapping: cached.mapping,
        processor,
        history: this.history,
        importId,
        externalDuplicateChecker,
        eventBus: this.eventBus ?? undefined,
        logger: this.logger,
      });

      const finalEvent = progress.failedRows > 0
        ? ImportExportEvent.IMPORT_COMPLETED
        : ImportExportEvent.IMPORT_COMPLETED;

      if (this.eventBus) {
        await this.eventBus.emit(finalEvent, {
          importId,
          tenantId: record.tenantId,
          definitionName: cached.definition.name,
        });
      }

      this.parsedCache.delete(importId);
      return progress;
    } catch (err) {
      await this.history.update(importId, {
        status: ImportStatus.FAILED,
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date().toISOString(),
      });

      if (this.eventBus) {
        await this.eventBus.emit(ImportExportEvent.IMPORT_FAILED, {
          importId,
          tenantId: record.tenantId,
          definitionName: cached.definition.name,
        });
      }

      throw new ProcessingError('Import processing failed', {
        importId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async getStatus(importId: string): Promise<ImportExportRecord> {
    return this.getRecord(importId);
  }

  async cancel(importId: string): Promise<void> {
    const record = await this.getRecord(importId);
    validateTransition(record.status as ImportStatusValue, ImportStatus.CANCELLED);
    await this.history.update(importId, {
      status: ImportStatus.CANCELLED,
      completedAt: new Date().toISOString(),
    });
    this.parsedCache.delete(importId);

    if (this.eventBus) {
      await this.eventBus.emit(ImportExportEvent.IMPORT_CANCELLED, {
        importId,
        tenantId: record.tenantId,
        definitionName: record.definitionName,
      });
    }

    this.logger.info('Import cancelled', { importId });
  }

  private async parseFile(
    _importId: string,
    data: string | Buffer,
    format: ImportFormatValue,
  ): Promise<ParseResult> {
    const parser = this.parsers.resolve(format);
    return parser.parse(data);
  }

  private async getRecord(importId: string): Promise<ImportExportRecord> {
    const record = await this.history.get(importId);
    if (!record) throw new ImportError(`Import not found: ${importId}`);
    return record;
  }
}
