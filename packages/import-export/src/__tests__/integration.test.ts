import { describe, it, expect, vi } from 'vitest';
import { ImportService } from '../imports/import-service';
import { ExportService } from '../exports/export-service';
import { InMemoryHistoryStore } from '../history/in-memory-store';
import { ImportStatus, ExportStatus, FieldType, ExportFormat } from '../types';
import type { ImportDefinition, ExportDefinition, OperationContext } from '../types';
import type { IImportRowProcessor } from '../imports/types';
import type { IExportDataProvider } from '../exports/types';

const context: OperationContext = { tenantId: 'tenant-1', userId: 'user-1' };

const contactDefinition: ImportDefinition = {
  name: 'contacts',
  fields: [
    { name: 'firstName', label: 'First Name', type: FieldType.STRING, required: true },
    { name: 'lastName', label: 'Last Name', type: FieldType.STRING, required: true },
    { name: 'email', label: 'Email', type: FieldType.EMAIL, required: true },
    { name: 'age', label: 'Age', type: FieldType.INTEGER },
    { name: 'active', label: 'Active', type: FieldType.BOOLEAN },
  ],
  duplicateKeys: ['email'],
  chunkSize: 2,
};

function createProcessor(): IImportRowProcessor & { processed: Record<string, unknown>[] } {
  const processed: Record<string, unknown>[] = [];
  return {
    processed,
    async processRow(row: Record<string, unknown>) {
      processed.push(row);
    },
  };
}

describe('Import — end-to-end lifecycle', () => {
  it('CSV: create → preview → process → complete', async () => {
    const history = new InMemoryHistoryStore();
    const service = new ImportService({ history });
    const processor = createProcessor();

    const csv = 'First Name,Last Name,Email,Age,Active\nAlice,Smith,alice@test.com,30,yes\nBob,Jones,bob@test.com,25,no';

    const record = await service.createImport('contacts.csv', csv.length, csv, contactDefinition, context);
    expect(record.status).toBe(ImportStatus.UPLOADED);
    expect(record.format).toBe('CSV');

    const preview = await service.parseAndPreview(record.id, contactDefinition);
    expect(preview.totalRows).toBe(2);
    expect(preview.validRows).toBeGreaterThanOrEqual(0);
    expect(preview.errors).toBeDefined();
    expect(preview.sampleRows.length).toBeGreaterThan(0);
    expect(preview.mapping.size).toBeGreaterThan(0);

    const progress = await service.confirmAndProcess(record.id, processor);
    expect(progress.totalRows).toBe(2);
    expect(progress.successfulRows).toBe(2);
    expect(progress.failedRows).toBe(0);
    expect(processor.processed).toHaveLength(2);
    expect(processor.processed[0]!['firstName']).toBe('Alice');
    expect(processor.processed[0]!['active']).toBe(true);
    expect(processor.processed[1]!['age']).toBe(25);
  });

  it('JSON: create → preview → process', async () => {
    const history = new InMemoryHistoryStore();
    const service = new ImportService({ history });
    const processor = createProcessor();

    const json = JSON.stringify([
      { firstName: 'Charlie', lastName: 'Brown', email: 'charlie@test.com', age: 8 },
    ]);

    const record = await service.createImport('contacts.json', json.length, json, contactDefinition, context);
    expect(record.format).toBe('JSON');

    const preview = await service.parseAndPreview(record.id, contactDefinition);
    expect(preview.totalRows).toBe(1);

    const progress = await service.confirmAndProcess(record.id, processor);
    expect(progress.successfulRows).toBe(1);
    expect(processor.processed[0]!['firstName']).toBe('Charlie');
  });

  it('detects in-file duplicates', async () => {
    const history = new InMemoryHistoryStore();
    const service = new ImportService({ history });
    const processor = createProcessor();

    const csv = 'First Name,Last Name,Email\nAlice,A,dup@test.com\nBob,B,unique@test.com\nCharlie,C,dup@test.com';

    const record = await service.createImport('dup.csv', csv.length, csv, contactDefinition, context);
    const preview = await service.parseAndPreview(record.id, contactDefinition);
    expect(preview.duplicateRows).toBe(1);

    const progress = await service.confirmAndProcess(record.id, processor);
    expect(progress.duplicateRows).toBe(1);
  });

  it('reports validation errors for invalid rows', async () => {
    const history = new InMemoryHistoryStore();
    const service = new ImportService({ history });
    const processor = createProcessor();

    const csv = 'First Name,Last Name,Email\nAlice,Smith,alice@test.com\n,,not-an-email';

    const record = await service.createImport('invalid.csv', csv.length, csv, contactDefinition, context);
    const preview = await service.parseAndPreview(record.id, contactDefinition);
    expect(preview.errors.length).toBeGreaterThan(0);

    const progress = await service.confirmAndProcess(record.id, processor);
    expect(progress.failedRows).toBeGreaterThan(0);
    expect(progress.successfulRows).toBe(1);
  });

  it('cancels an import', async () => {
    const history = new InMemoryHistoryStore();
    const service = new ImportService({ history });

    const csv = 'First Name,Last Name,Email\nAlice,Smith,alice@test.com';
    const record = await service.createImport('cancel.csv', csv.length, csv, contactDefinition, context);

    await service.cancel(record.id);
    const status = await service.getStatus(record.id);
    expect(status.status).toBe(ImportStatus.CANCELLED);
  });

  it('emits events throughout lifecycle', async () => {
    const events: { event: string; payload: unknown }[] = [];
    const eventBus = {
      emit: vi.fn(async (event: string, payload: unknown) => {
        events.push({ event, payload });
      }),
      on: vi.fn(),
      off: vi.fn(),
    };

    const history = new InMemoryHistoryStore();
    const service = new ImportService({ history, eventBus: eventBus as unknown as import('@maw/sdk').EventBus });
    const processor = createProcessor();

    const csv = 'First Name,Last Name,Email\nAlice,A,a@test.com';
    const record = await service.createImport('events.csv', csv.length, csv, contactDefinition, context);
    await service.parseAndPreview(record.id, contactDefinition);
    await service.confirmAndProcess(record.id, processor);

    const eventNames = events.map((e) => e.event);
    expect(eventNames).toContain('import.created');
    expect(eventNames).toContain('import.preview_ready');
    expect(eventNames).toContain('import.started');
    expect(eventNames).toContain('import.progress');
    expect(eventNames).toContain('import.completed');
  });

  it('handles processor errors gracefully', async () => {
    const history = new InMemoryHistoryStore();
    const service = new ImportService({ history });
    const failingProcessor: IImportRowProcessor = {
      async processRow() {
        throw new Error('DB connection failed');
      },
    };

    const csv = 'First Name,Last Name,Email\nAlice,A,a@test.com\nBob,B,b@test.com';
    const record = await service.createImport('fail.csv', csv.length, csv, contactDefinition, context);
    await service.parseAndPreview(record.id, contactDefinition);
    const progress = await service.confirmAndProcess(record.id, failingProcessor);

    expect(progress.failedRows).toBe(2);
    expect(progress.successfulRows).toBe(0);
  });
});

describe('Export — end-to-end lifecycle', () => {
  const exportDef: ExportDefinition = {
    name: 'contacts-export',
    fields: [
      { name: 'firstName', label: 'First Name' },
      { name: 'lastName', label: 'Last Name' },
      { name: 'email', label: 'Email' },
    ],
    format: ExportFormat.CSV,
    chunkSize: 2,
  };

  const sampleData = [
    { firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' },
    { firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' },
    { firstName: 'Charlie', lastName: 'Brown', email: 'charlie@test.com' },
  ];

  function createProvider(data: Record<string, unknown>[]): IExportDataProvider {
    return {
      async count() {
        return data.length;
      },
      async fetch(_filters, offset, limit) {
        return data.slice(offset, offset + limit);
      },
    };
  }

  it('CSV export: create → process → content', async () => {
    const history = new InMemoryHistoryStore();
    const service = new ExportService({ history });
    const provider = createProvider(sampleData);

    const record = await service.createExport(exportDef, context);
    expect(record.status).toBe(ExportStatus.PENDING);
    expect(record.type).toBe('EXPORT');

    const result = await service.processExport(record.id, exportDef, provider);
    expect(result.progress.totalRows).toBe(3);
    expect(result.progress.processedRows).toBe(3);
    expect(result.content).toContain('First Name');
    expect(result.content).toContain('Alice');
    expect(result.content).toContain('charlie@test.com');

    const status = await service.getStatus(record.id);
    expect(status.status).toBe(ExportStatus.COMPLETED);
  });

  it('JSON export', async () => {
    const jsonDef: ExportDefinition = { ...exportDef, format: ExportFormat.JSON };
    const history = new InMemoryHistoryStore();
    const service = new ExportService({ history });
    const provider = createProvider(sampleData);

    const record = await service.createExport(jsonDef, context);
    const result = await service.processExport(record.id, jsonDef, provider);

    const parsed = JSON.parse(result.content);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]['First Name']).toBe('Alice');
  });

  it('cancels an export', async () => {
    const history = new InMemoryHistoryStore();
    const service = new ExportService({ history });

    const record = await service.createExport(exportDef, context);
    await service.cancel(record.id);

    const status = await service.getStatus(record.id);
    expect(status.status).toBe(ExportStatus.CANCELLED);
  });

  it('emits events', async () => {
    const events: string[] = [];
    const eventBus = {
      emit: vi.fn(async (event: string) => { events.push(event); }),
      on: vi.fn(),
      off: vi.fn(),
    };

    const history = new InMemoryHistoryStore();
    const service = new ExportService({ history, eventBus: eventBus as unknown as import('@maw/sdk').EventBus });
    const provider = createProvider(sampleData);

    const record = await service.createExport(exportDef, context);
    await service.processExport(record.id, exportDef, provider);

    expect(events).toContain('export.created');
    expect(events).toContain('export.started');
    expect(events).toContain('export.progress');
    expect(events).toContain('export.completed');
  });

  it('applies field transforms', async () => {
    const transformDef: ExportDefinition = {
      name: 'upper-export',
      fields: [
        { name: 'firstName', label: 'Name', transform: (v) => String(v).toUpperCase() },
      ],
      format: ExportFormat.JSON,
    };
    const history = new InMemoryHistoryStore();
    const service = new ExportService({ history });
    const provider = createProvider([{ firstName: 'alice' }]);

    const record = await service.createExport(transformDef, context);
    const result = await service.processExport(record.id, transformDef, provider);
    const parsed = JSON.parse(result.content);
    expect(parsed[0]['Name']).toBe('ALICE');
  });

  it('handles empty data export', async () => {
    const history = new InMemoryHistoryStore();
    const service = new ExportService({ history });
    const provider = createProvider([]);

    const record = await service.createExport(exportDef, context);
    const result = await service.processExport(record.id, exportDef, provider);
    expect(result.progress.totalRows).toBe(0);
    expect(result.progress.percentage).toBe(100);
  });
});

describe('History store', () => {
  it('CRUD operations', async () => {
    const store = new InMemoryHistoryStore();

    await store.create({
      id: 'rec-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'IMPORT',
      format: 'CSV',
      fileName: 'test.csv',
      status: ImportStatus.UPLOADED,
      definitionName: 'test',
      createdAt: new Date().toISOString(),
    });

    const rec = await store.get('rec-1');
    expect(rec).not.toBeNull();
    expect(rec!.fileName).toBe('test.csv');

    await store.update('rec-1', { status: ImportStatus.COMPLETED });
    const updated = await store.get('rec-1');
    expect(updated!.status).toBe(ImportStatus.COMPLETED);

    const list = await store.list('tenant-1');
    expect(list).toHaveLength(1);

    const filteredList = await store.list('tenant-1', 'EXPORT');
    expect(filteredList).toHaveLength(0);

    await store.delete('rec-1');
    expect(await store.get('rec-1')).toBeNull();
  });

  it('list filters by tenant', async () => {
    const store = new InMemoryHistoryStore();

    await store.create({
      id: 'r1', tenantId: 't1', userId: 'u1', type: 'IMPORT', format: 'CSV',
      fileName: 'a.csv', status: 'UPLOADED', definitionName: 'x', createdAt: '2024-01-01',
    });
    await store.create({
      id: 'r2', tenantId: 't2', userId: 'u2', type: 'IMPORT', format: 'CSV',
      fileName: 'b.csv', status: 'UPLOADED', definitionName: 'x', createdAt: '2024-01-02',
    });

    const t1Records = await store.list('t1');
    expect(t1Records).toHaveLength(1);
    expect(t1Records[0]!.id).toBe('r1');
  });
});
