import type { ExportFormatValue } from '../types';
import { UnsupportedFormatError } from '../errors';
import type { IFormatter } from './types';
import { CSVFormatter } from './csv-formatter';
import { JSONFormatter } from './json-formatter';

export class FormatterRegistry {
  private readonly formatters = new Map<ExportFormatValue, IFormatter>();

  register(formatter: IFormatter): void {
    this.formatters.set(formatter.format, formatter);
  }

  resolve(format: ExportFormatValue): IFormatter {
    const formatter = this.formatters.get(format);
    if (!formatter) throw new UnsupportedFormatError(format);
    return formatter;
  }

  has(format: ExportFormatValue): boolean {
    return this.formatters.has(format);
  }
}

export function createDefaultFormatters(): FormatterRegistry {
  const registry = new FormatterRegistry();
  registry.register(new CSVFormatter());
  registry.register(new JSONFormatter());
  return registry;
}
