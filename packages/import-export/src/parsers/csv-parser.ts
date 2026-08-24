import { ImportFormat } from '../types';
import { ParserError } from '../errors';
import type { IParser, ParsedRow, ParseResult, ParserOptions } from './types';

export class CSVParser implements IParser {
  readonly format = ImportFormat.CSV;

  async parse(data: string | Buffer, options?: ParserOptions): Promise<ParseResult> {
    const text = typeof data === 'string' ? data : new TextDecoder(options?.encoding ?? 'utf-8').decode(data);
    const delimiter = options?.delimiter ?? ',';
    const headerRow = options?.headerRow !== false;

    const rows = parseCSVRows(text, delimiter);
    if (rows.length === 0) {
      throw new ParserError('CSV file is empty');
    }

    const headers = headerRow ? (rows.shift()! as string[]) : rows[0]!.map((_, i) => `column_${i + 1}`);
    if (headers.length === 0) {
      throw new ParserError('CSV file has no columns');
    }

    const maxRows = options?.maxRows;
    const dataRows = maxRows !== undefined ? rows.slice(0, maxRows) : rows;

    const parsed: ParsedRow[] = dataRows.map((cells) => {
      const row: ParsedRow = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]!] = cells[i] ?? null;
      }
      return row;
    });

    return { headers, rows: parsed, totalRows: rows.length };
  }
}

function parseCSVRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i]!;

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        current.push(field);
        field = '';
        i++;
      } else if (ch === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') i++;
        current.push(field);
        field = '';
        if (current.some((c) => c.length > 0)) rows.push(current);
        current = [];
        i++;
      } else if (ch === '\n') {
        current.push(field);
        field = '';
        if (current.some((c) => c.length > 0)) rows.push(current);
        current = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  current.push(field);
  if (current.some((c) => c.length > 0)) rows.push(current);

  return rows;
}
