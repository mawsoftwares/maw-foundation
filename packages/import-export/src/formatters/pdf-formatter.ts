import { ExportFormat, type ExportFieldDefinition } from '../types';
import { UnsupportedFormatError } from '../errors';
import type { IFormatter, FormatterOptions } from './types';

export class PDFFormatter implements IFormatter {
  readonly format = ExportFormat.PDF;

  formatRows(
    _rows: readonly Record<string, unknown>[],
    _fields: readonly ExportFieldDefinition[],
    _options?: FormatterOptions,
  ): string {
    throw new UnsupportedFormatError(
      'PDF formatting requires a provider implementation. Register a PDFFormatter adapter backed by a library such as pdfkit or jspdf.',
    );
  }
}
