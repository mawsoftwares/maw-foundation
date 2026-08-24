import type { ExportFormatValue, ExportFieldDefinition } from '../types';

export interface FormatterOptions {
  readonly delimiter?: string;
  readonly includeHeaders?: boolean;
  readonly jsonStructure?: 'array' | 'object';
  readonly jsonMetadata?: Record<string, unknown>;
}

export interface IFormatter {
  readonly format: ExportFormatValue;
  formatRows(rows: readonly Record<string, unknown>[], fields: readonly ExportFieldDefinition[], options?: FormatterOptions): string;
  formatHeader?(fields: readonly ExportFieldDefinition[], options?: FormatterOptions): string;
}
