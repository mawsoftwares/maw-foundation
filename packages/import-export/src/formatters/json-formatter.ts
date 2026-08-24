import { ExportFormat, type ExportFieldDefinition } from '../types';
import type { IFormatter, FormatterOptions } from './types';

export class JSONFormatter implements IFormatter {
  readonly format = ExportFormat.JSON;

  formatRows(
    rows: readonly Record<string, unknown>[],
    fields: readonly ExportFieldDefinition[],
    options?: FormatterOptions,
  ): string {
    const mapped = rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const field of fields) {
        let value = row[field.name];
        if (field.transform) value = field.transform(value);
        out[field.label ?? field.name] = value ?? null;
      }
      return out;
    });

    if (options?.jsonStructure === 'object') {
      return JSON.stringify({ data: mapped, metadata: options.jsonMetadata ?? {} }, null, 2);
    }

    return JSON.stringify(mapped, null, 2);
  }
}
