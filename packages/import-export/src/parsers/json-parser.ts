import { ImportFormat } from '../types';
import { ParserError } from '../errors';
import type { IParser, ParsedRow, ParseResult, ParserOptions } from './types';

export class JSONParser implements IParser {
  readonly format = ImportFormat.JSON;

  async parse(data: string | Buffer, options?: ParserOptions): Promise<ParseResult> {
    const text = typeof data === 'string' ? data : new TextDecoder(options?.encoding ?? 'utf-8').decode(data);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ParserError('Invalid JSON');
    }

    const items = extractArray(parsed);
    if (!items) {
      throw new ParserError('JSON must be an array or an object containing a "data" array');
    }

    if (items.length === 0) {
      return { headers: [], rows: [], totalRows: 0 };
    }

    const maxRows = options?.maxRows;
    const sliced = maxRows !== undefined ? items.slice(0, maxRows) : items;

    const headerSet = new Set<string>();
    for (const item of sliced) {
      if (typeof item === 'object' && item !== null) {
        flattenKeys(item as Record<string, unknown>, '', headerSet);
      }
    }
    const headers = Array.from(headerSet);

    const rows: ParsedRow[] = sliced.map((item) => {
      if (typeof item !== 'object' || item === null) {
        throw new ParserError('Each JSON array element must be an object');
      }
      const flat: ParsedRow = {};
      flattenValues(item as Record<string, unknown>, '', flat);
      return flat;
    });

    return { headers, rows, totalRows: items.length };
  }
}

function extractArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj['data'])) return obj['data'];
    const keys = Object.keys(obj);
    for (const key of keys) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  return null;
}

function flattenKeys(obj: Record<string, unknown>, prefix: string, keys: Set<string>): void {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      flattenKeys(val as Record<string, unknown>, fullKey, keys);
    } else {
      keys.add(fullKey);
    }
  }
}

function flattenValues(obj: Record<string, unknown>, prefix: string, out: ParsedRow): void {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      flattenValues(val as Record<string, unknown>, fullKey, out);
    } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      out[fullKey] = val;
    } else {
      out[fullKey] = val === null || val === undefined ? null : String(val);
    }
  }
}
