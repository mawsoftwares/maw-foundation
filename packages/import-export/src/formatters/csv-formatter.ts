import { ExportFormat, type ExportFieldDefinition } from '../types';
import { sanitizeCellValue } from '../security';
import type { IFormatter, FormatterOptions } from './types';

export class CSVFormatter implements IFormatter {
  readonly format = ExportFormat.CSV;

  formatHeader(fields: readonly ExportFieldDefinition[], options?: FormatterOptions): string {
    const delimiter = options?.delimiter ?? ',';
    return fields.map((f) => escapeCSV(f.label, delimiter)).join(delimiter) + '\n';
  }

  formatRows(
    rows: readonly Record<string, unknown>[],
    fields: readonly ExportFieldDefinition[],
    options?: FormatterOptions,
  ): string {
    const delimiter = options?.delimiter ?? ',';
    const includeHeaders = options?.includeHeaders !== false;
    let output = '';

    if (includeHeaders) {
      output += this.formatHeader(fields, options);
    }

    for (const row of rows) {
      const cells = fields.map((field) => {
        let value = row[field.name];
        if (field.transform) value = field.transform(value);
        const str = value === null || value === undefined ? '' : String(value);
        return escapeCSV(sanitizeCellValue(str), delimiter);
      });
      output += cells.join(delimiter) + '\n';
    }

    return output;
  }
}

function escapeCSV(value: string, delimiter: string): string {
  if (value.includes('"') || value.includes(delimiter) || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
