import { describe, it, expect } from 'vitest';
import { CSVParser } from '../parsers/csv-parser';
import { JSONParser } from '../parsers/json-parser';
import { CSVFormatter } from '../formatters/csv-formatter';
import { JSONFormatter } from '../formatters/json-formatter';
import { ColumnMapper } from '../mapping/mapper';
import { RowValidator } from '../validation/row-validator';
import { FileValidator } from '../validation/file-validator';
import { InFileDuplicateChecker } from '../duplicates/in-file-checker';
import { validateTransition, canTransition } from '../imports/state-machine';
import { sanitizeCellValue, sanitizeFilePath, sanitizeRowValue } from '../security';
import { ImportStatus, FieldType } from '../types';
import type { ImportDefinition, ExportFieldDefinition } from '../types';
import { InvalidStateTransitionError } from '../errors';

// ──── Parsers ────

describe('CSVParser', () => {
  const parser = new CSVParser();

  it('parses basic CSV with headers', async () => {
    const csv = 'name,email\nAlice,alice@test.com\nBob,bob@test.com';
    const result = await parser.parse(csv);
    expect(result.headers).toEqual(['name', 'email']);
    expect(result.totalRows).toBe(2);
    expect(result.rows[0]).toEqual({ name: 'Alice', email: 'alice@test.com' });
  });

  it('handles quoted fields with commas', async () => {
    const csv = 'name,address\n"Smith, John","123 Main St"';
    const result = await parser.parse(csv);
    expect(result.rows[0]!['name']).toBe('Smith, John');
  });

  it('handles escaped quotes', async () => {
    const csv = 'name,note\nAlice,"She said ""hello"""';
    const result = await parser.parse(csv);
    expect(result.rows[0]!['note']).toBe('She said "hello"');
  });

  it('handles embedded newlines in quoted fields', async () => {
    const csv = 'name,bio\nAlice,"Line 1\nLine 2"';
    const result = await parser.parse(csv);
    expect(result.rows[0]!['bio']).toBe('Line 1\nLine 2');
  });

  it('handles empty fields', async () => {
    const csv = 'a,b,c\n1,,3';
    const result = await parser.parse(csv);
    expect(result.rows[0]!['b']).toBe('');
  });

  it('supports custom delimiter', async () => {
    const tsv = 'name\temail\nAlice\talice@test.com';
    const result = await parser.parse(tsv, { delimiter: '\t' });
    expect(result.rows[0]!['email']).toBe('alice@test.com');
  });

  it('limits rows with maxRows option', async () => {
    const csv = 'n\n1\n2\n3\n4\n5';
    const result = await parser.parse(csv, { maxRows: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.totalRows).toBe(5);
  });

  it('throws on empty CSV', async () => {
    await expect(parser.parse('')).rejects.toThrow('CSV file is empty');
  });

  it('handles CRLF line endings', async () => {
    const csv = 'a,b\r\n1,2\r\n3,4';
    const result = await parser.parse(csv);
    expect(result.totalRows).toBe(2);
  });
});

describe('JSONParser', () => {
  const parser = new JSONParser();

  it('parses JSON array', async () => {
    const json = JSON.stringify([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]);
    const result = await parser.parse(json);
    expect(result.headers).toContain('name');
    expect(result.headers).toContain('age');
    expect(result.totalRows).toBe(2);
  });

  it('parses { data: [...] } structure', async () => {
    const json = JSON.stringify({ data: [{ x: 1 }] });
    const result = await parser.parse(json);
    expect(result.rows[0]!['x']).toBe(1);
  });

  it('flattens nested objects with dot notation', async () => {
    const json = JSON.stringify([{ address: { city: 'NYC', zip: '10001' } }]);
    const result = await parser.parse(json);
    expect(result.rows[0]!['address.city']).toBe('NYC');
    expect(result.headers).toContain('address.zip');
  });

  it('handles empty array', async () => {
    const result = await parser.parse('[]');
    expect(result.totalRows).toBe(0);
    expect(result.headers).toEqual([]);
  });

  it('throws on invalid JSON', async () => {
    await expect(parser.parse('not json')).rejects.toThrow('Invalid JSON');
  });

  it('throws on non-array/non-object JSON', async () => {
    await expect(parser.parse('"just a string"')).rejects.toThrow();
  });
});

// ──── Formatters ────

describe('CSVFormatter', () => {
  const formatter = new CSVFormatter();
  const fields: ExportFieldDefinition[] = [
    { name: 'name', label: 'Name' },
    { name: 'email', label: 'Email' },
  ];

  it('formats rows with headers', () => {
    const rows = [{ name: 'Alice', email: 'a@b.com' }];
    const csv = formatter.formatRows(rows, fields);
    expect(csv).toContain('Name,Email');
    expect(csv).toContain('Alice,a@b.com');
  });

  it('escapes values containing commas', () => {
    const rows = [{ name: 'Smith, John', email: 'j@s.com' }];
    const csv = formatter.formatRows(rows, fields);
    expect(csv).toContain('"Smith, John"');
  });

  it('sanitizes formula injection', () => {
    const rows = [{ name: '=CMD()', email: 'a@b.com' }];
    const csv = formatter.formatRows(rows, fields);
    expect(csv).toContain('\t=CMD()');
    expect(csv).not.toMatch(/(?<!\t)=CMD\(\)/);
  });

  it('handles null/undefined values', () => {
    const rows = [{ name: null, email: undefined }];
    const csv = formatter.formatRows(rows, fields);
    const lines = csv.trim().split('\n');
    expect(lines[1]).toBe(',');
  });
});

describe('JSONFormatter', () => {
  const formatter = new JSONFormatter();
  const fields: ExportFieldDefinition[] = [
    { name: 'id', label: 'ID' },
    { name: 'val', label: 'Value' },
  ];

  it('formats as JSON array', () => {
    const rows = [{ id: 1, val: 'x' }, { id: 2, val: 'y' }];
    const json = formatter.formatRows(rows, fields);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]['ID']).toBe(1);
  });

  it('formats with metadata when configured', () => {
    const rows = [{ id: 1, val: 'x' }];
    const json = formatter.formatRows(rows, fields, {
      jsonStructure: 'object',
      jsonMetadata: { exportedBy: 'test' },
    });
    const parsed = JSON.parse(json);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.metadata.exportedBy).toBe('test');
  });
});

// ──── Mapping ────

describe('ColumnMapper', () => {
  const mapper = new ColumnMapper();
  const definition: ImportDefinition = {
    name: 'test',
    fields: [
      { name: 'firstName', label: 'First Name', type: FieldType.STRING, required: true },
      { name: 'email', label: 'Email', type: FieldType.EMAIL, required: true, aliases: ['e-mail', 'emailAddress'] },
      { name: 'age', label: 'Age', type: FieldType.INTEGER },
    ],
  };

  it('auto-maps by exact field name (case-insensitive)', () => {
    const result = mapper.mapColumns(['firstName', 'email', 'age'], definition);
    expect(result.mapped.get('firstName')).toBe('firstName');
    expect(result.mapped.get('email')).toBe('email');
    expect(result.unmappedColumns).toHaveLength(0);
  });

  it('auto-maps by label', () => {
    const result = mapper.mapColumns(['First Name', 'Email', 'Age'], definition);
    expect(result.mapped.get('First Name')).toBe('firstName');
  });

  it('auto-maps by alias', () => {
    const result = mapper.mapColumns(['firstName', 'e-mail', 'age'], definition);
    expect(result.mapped.get('e-mail')).toBe('email');
  });

  it('reports unmapped columns', () => {
    const result = mapper.mapColumns(['firstName', 'email', 'extraCol'], definition);
    expect(result.unmappedColumns).toContain('extraCol');
  });

  it('reports missing required fields', () => {
    const result = mapper.mapColumns(['age'], definition);
    expect(result.missingRequiredFields).toContain('firstName');
    expect(result.missingRequiredFields).toContain('email');
  });

  it('applies manual mapping config', () => {
    const result = mapper.mapColumns(['col_a', 'col_b'], definition, {
      mappings: [{ source: 'col_a', target: 'firstName' }, { source: 'col_b', target: 'email' }],
    });
    expect(result.mapped.get('col_a')).toBe('firstName');
    expect(result.mapped.get('col_b')).toBe('email');
  });

  it('applies type coercion for boolean', () => {
    const boolDef: ImportDefinition = {
      name: 'test',
      fields: [{ name: 'active', label: 'Active', type: FieldType.BOOLEAN }],
    };
    const mapping = new Map([['active', 'active']]);
    const row = mapper.applyMapping({ active: 'yes' }, mapping, boolDef);
    expect(row['active']).toBe(true);
  });

  it('applies type coercion for integer', () => {
    const intDef: ImportDefinition = {
      name: 'test',
      fields: [{ name: 'count', label: 'Count', type: FieldType.INTEGER }],
    };
    const mapping = new Map([['count', 'count']]);
    const row = mapper.applyMapping({ count: '42' }, mapping, intDef);
    expect(row['count']).toBe(42);
  });

  it('applies default values for missing fields', () => {
    const defWithDefault: ImportDefinition = {
      name: 'test',
      fields: [{ name: 'status', label: 'Status', type: FieldType.STRING, defaultValue: 'active' }],
    };
    const mapping = new Map<string, string>();
    const row = mapper.applyMapping({}, mapping, defWithDefault);
    expect(row['status']).toBe('active');
  });

  it('applies transform functions', () => {
    const transformDef: ImportDefinition = {
      name: 'test',
      fields: [{ name: 'name', label: 'Name', type: FieldType.STRING, transform: (v) => String(v).toUpperCase() }],
    };
    const mapping = new Map([['name', 'name']]);
    const row = mapper.applyMapping({ name: 'alice' }, mapping, transformDef);
    expect(row['name']).toBe('ALICE');
  });
});

// ──── Validation ────

describe('RowValidator', () => {
  const validator = new RowValidator();

  it('passes valid row', () => {
    const def: ImportDefinition = {
      name: 'test',
      fields: [
        { name: 'name', label: 'Name', type: FieldType.STRING, required: true },
        { name: 'email', label: 'Email', type: FieldType.EMAIL, required: true },
      ],
    };
    const result = validator.validate({ name: 'Alice', email: 'alice@test.com' }, 1, def);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails on missing required field', () => {
    const def: ImportDefinition = {
      name: 'test',
      fields: [{ name: 'name', label: 'Name', type: FieldType.STRING, required: true }],
    };
    const result = validator.validate({ name: null }, 1, def);
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.errorCode).toBe('REQUIRED');
  });

  it('fails on invalid email', () => {
    const def: ImportDefinition = {
      name: 'test',
      fields: [{ name: 'email', label: 'Email', type: FieldType.EMAIL }],
    };
    const result = validator.validate({ email: 'not-an-email' }, 1, def);
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.errorCode).toBe('INVALID_EMAIL');
  });

  it('validates enum values', () => {
    const def: ImportDefinition = {
      name: 'test',
      fields: [{ name: 'status', label: 'Status', type: FieldType.ENUM, enumValues: ['active', 'inactive'] }],
    };
    const result = validator.validate({ status: 'unknown' }, 1, def);
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.errorCode).toBe('INVALID_ENUM');
  });

  it('validates number type', () => {
    const def: ImportDefinition = {
      name: 'test',
      fields: [{ name: 'age', label: 'Age', type: FieldType.NUMBER }],
    };
    const result = validator.validate({ age: 'not-a-number' }, 1, def);
    expect(result.valid).toBe(false);
  });

  it('validates min/max values', () => {
    const def: ImportDefinition = {
      name: 'test',
      fields: [{ name: 'age', label: 'Age', type: FieldType.NUMBER, min: 0, max: 120 }],
    };
    const result = validator.validate({ age: -5 }, 1, def);
    expect(result.valid).toBe(false);
  });

  it('runs cross-field validator', () => {
    const def: ImportDefinition = {
      name: 'test',
      fields: [
        { name: 'start', label: 'Start', type: FieldType.STRING },
        { name: 'end', label: 'End', type: FieldType.STRING },
      ],
      crossFieldValidator: (row) => {
        if (row['start'] && row['end'] && row['start']! > row['end']!) {
          return [{ rowNumber: 0, errorCode: 'CROSS_FIELD', message: 'Start must be before end', severity: 'ERROR' as const }];
        }
        return [];
      },
    };
    const result = validator.validate({ start: 'Z', end: 'A' }, 1, def);
    expect(result.valid).toBe(false);
  });

  it('skips validation for empty non-required fields', () => {
    const def: ImportDefinition = {
      name: 'test',
      fields: [{ name: 'email', label: 'Email', type: FieldType.EMAIL }],
    };
    const result = validator.validate({ email: '' }, 1, def);
    expect(result.valid).toBe(true);
  });
});

describe('FileValidator', () => {
  const validator = new FileValidator();

  it('accepts valid CSV file', () => {
    const def: ImportDefinition = { name: 'test', fields: [], allowedFormats: ['CSV'] };
    const format = validator.validate('data.csv', 1024, def);
    expect(format).toBe('CSV');
  });

  it('rejects disallowed format', () => {
    const def: ImportDefinition = { name: 'test', fields: [], allowedFormats: ['CSV'] };
    expect(() => validator.validate('data.json', 1024, def)).toThrow();
  });

  it('rejects oversized file', () => {
    const def: ImportDefinition = { name: 'test', fields: [], maxFileSize: 100 };
    expect(() => validator.validate('data.csv', 200, def)).toThrow();
  });
});

// ──── Duplicates ────

describe('InFileDuplicateChecker', () => {
  const checker = new InFileDuplicateChecker();

  it('detects duplicates by single key', async () => {
    const rows = [
      { email: 'a@b.com', name: 'Alice' },
      { email: 'c@d.com', name: 'Bob' },
      { email: 'a@b.com', name: 'Alice2' },
    ];
    const result = await checker.check(rows, ['email']);
    expect(result.duplicateCount).toBe(1);
    expect(result.duplicates[0]!.rowNumber).toBe(3);
    expect(result.duplicates[0]!.duplicateOfRow).toBe(1);
  });

  it('detects duplicates by composite key', async () => {
    const rows = [
      { first: 'John', last: 'Smith' },
      { first: 'Jane', last: 'Smith' },
      { first: 'John', last: 'Smith' },
    ];
    const result = await checker.check(rows, ['first', 'last']);
    expect(result.duplicateCount).toBe(1);
  });

  it('ignores rows with null key values', async () => {
    const rows = [
      { email: null, name: 'A' },
      { email: null, name: 'B' },
    ];
    const result = await checker.check(rows, ['email']);
    expect(result.duplicateCount).toBe(0);
  });

  it('returns zero duplicates for unique rows', async () => {
    const rows = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const result = await checker.check(rows, ['id']);
    expect(result.duplicateCount).toBe(0);
    expect(result.uniqueCount).toBe(3);
  });

  it('handles empty keys array', async () => {
    const rows = [{ id: '1' }, { id: '1' }];
    const result = await checker.check(rows, []);
    expect(result.duplicateCount).toBe(0);
  });
});

// ──── State Machine ────

describe('ImportStateMachine', () => {
  it('allows UPLOADED → PARSING', () => {
    expect(() => validateTransition(ImportStatus.UPLOADED, ImportStatus.PARSING)).not.toThrow();
  });

  it('allows PARSING → PREVIEW_READY', () => {
    expect(() => validateTransition(ImportStatus.PARSING, ImportStatus.PREVIEW_READY)).not.toThrow();
  });

  it('allows PREVIEW_READY → PROCESSING', () => {
    expect(() => validateTransition(ImportStatus.PREVIEW_READY, ImportStatus.PROCESSING)).not.toThrow();
  });

  it('allows PROCESSING → COMPLETED', () => {
    expect(() => validateTransition(ImportStatus.PROCESSING, ImportStatus.COMPLETED)).not.toThrow();
  });

  it('allows any → CANCELLED', () => {
    expect(() => validateTransition(ImportStatus.UPLOADED, ImportStatus.CANCELLED)).not.toThrow();
    expect(() => validateTransition(ImportStatus.PREVIEW_READY, ImportStatus.CANCELLED)).not.toThrow();
  });

  it('rejects UPLOADED → COMPLETED', () => {
    expect(() => validateTransition(ImportStatus.UPLOADED, ImportStatus.COMPLETED)).toThrow(InvalidStateTransitionError);
  });

  it('rejects COMPLETED → PROCESSING', () => {
    expect(() => validateTransition(ImportStatus.COMPLETED, ImportStatus.PROCESSING)).toThrow(InvalidStateTransitionError);
  });

  it('canTransition returns correct boolean', () => {
    expect(canTransition(ImportStatus.UPLOADED, ImportStatus.PARSING)).toBe(true);
    expect(canTransition(ImportStatus.COMPLETED, ImportStatus.PARSING)).toBe(false);
  });
});

// ──── Security ────

describe('Security', () => {
  describe('sanitizeCellValue', () => {
    it('prefixes formula triggers with tab', () => {
      expect(sanitizeCellValue('=1+1')).toBe('\t=1+1');
      expect(sanitizeCellValue('+1')).toBe('\t+1');
      expect(sanitizeCellValue('-1')).toBe('\t-1');
      expect(sanitizeCellValue('@SUM(A1)')).toBe('\t@SUM(A1)');
    });

    it('leaves normal values unchanged', () => {
      expect(sanitizeCellValue('hello')).toBe('hello');
      expect(sanitizeCellValue('123')).toBe('123');
    });

    it('handles empty string', () => {
      expect(sanitizeCellValue('')).toBe('');
    });
  });

  describe('sanitizeFilePath', () => {
    it('removes path traversal', () => {
      expect(sanitizeFilePath('../../../etc/passwd')).not.toContain('..');
    });

    it('strips leading slashes', () => {
      expect(sanitizeFilePath('/etc/passwd')).toBe('etc/passwd');
    });

    it('replaces invalid characters', () => {
      const result = sanitizeFilePath('file<name>:test');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain(':');
    });
  });

  describe('sanitizeRowValue', () => {
    it('truncates long values', () => {
      const long = 'x'.repeat(200);
      const result = sanitizeRowValue(long, 100);
      expect(result.length).toBeLessThanOrEqual(102);
    });

    it('handles null/undefined', () => {
      expect(sanitizeRowValue(null)).toBe('');
      expect(sanitizeRowValue(undefined)).toBe('');
    });

    it('preserves short values', () => {
      expect(sanitizeRowValue('hello')).toBe('hello');
    });
  });
});
