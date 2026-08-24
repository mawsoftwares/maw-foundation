import { ExportFormat, type ExportFieldDefinition } from '../types';
import { UnsupportedFormatError } from '../errors';
import type { IFormatter, FormatterOptions } from './types';

export class ExcelFormatter implements IFormatter {
  readonly format = ExportFormat.EXCEL;

  formatRows(
    _rows: readonly Record<string, unknown>[],
    _fields: readonly ExportFieldDefinition[],
    _options?: FormatterOptions,
  ): string {
    throw new UnsupportedFormatError(
      'Excel formatting requires a provider implementation. Register an ExcelFormatter adapter backed by a library such as exceljs.',
    );
  }
}
