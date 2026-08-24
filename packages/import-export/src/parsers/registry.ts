import type { ImportFormatValue } from '../types';
import { UnsupportedFormatError } from '../errors';
import type { IParser } from './types';
import { CSVParser } from './csv-parser';
import { JSONParser } from './json-parser';

export class ParserRegistry {
  private readonly parsers = new Map<ImportFormatValue, IParser>();

  register(parser: IParser): void {
    this.parsers.set(parser.format, parser);
  }

  resolve(format: ImportFormatValue): IParser {
    const parser = this.parsers.get(format);
    if (!parser) throw new UnsupportedFormatError(format);
    return parser;
  }

  has(format: ImportFormatValue): boolean {
    return this.parsers.has(format);
  }
}

export function createDefaultParsers(): ParserRegistry {
  const registry = new ParserRegistry();
  registry.register(new CSVParser());
  registry.register(new JSONParser());
  return registry;
}
