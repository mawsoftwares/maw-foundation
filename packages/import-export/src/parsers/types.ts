import type { ImportFormatValue } from '../types';

export type ParsedRow = Record<string, string | number | boolean | null>;

export interface ParseResult {
  readonly headers: readonly string[];
  readonly rows: readonly ParsedRow[];
  readonly totalRows: number;
}

export interface ParserOptions {
  readonly delimiter?: string;
  readonly encoding?: string;
  readonly maxRows?: number;
  readonly headerRow?: boolean;
}

export interface IParser {
  readonly format: ImportFormatValue;
  parse(data: string | Buffer, options?: ParserOptions): Promise<ParseResult>;
}
