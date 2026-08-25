import { describe, it, expect, vi } from 'vitest';
import {
  ReportService,
  ReportDefinitionRegistry,
  ReportDataSourceRegistry,
  InMemoryReportHistory,
  InMemorySavedReportStore,
  ColumnType,
  DateRangePreset,
  AggregationType,
  ReportNotFoundError,
  ReportAuthorizationError,
  FilterBuilder,
} from '../index';
import type {
  IReportDataSource,
  ReportDefinition,
  ComputedColumnDefinition,
  OperationContext,
  ReportQuery,
  AggregateQuery,
  AggregationResult,
} from '../index';
import type { FilterGroup } from '../filters/types';

// ─── Test Fixtures ────────────────────────────────────────────────────

const TENANT = 'tenant-1';
const USER = 'user-1';
const CTX: OperationContext = { tenantId: TENANT, userId: USER };

const SALES_DATA = [
  { date: '2024-06-01', customer: 'Alice', quantity: 3, unitPrice: 1500, status: 'paid' },
  { date: '2024-06-02', customer: 'Bob', quantity: 1, unitPrice: 5000, status: 'pending' },
  { date: '2024-06-03', customer: 'Alice', quantity: 2, unitPrice: 2000, status: 'paid' },
  { date: '2024-06-04', customer: 'Charlie', quantity: 5, unitPrice: 800, status: 'cancelled' },
  { date: '2024-06-05', customer: 'Bob', quantity: 10, unitPrice: 500, status: 'paid' },
];

function makeSalesDefinition(): ReportDefinition {
  return {
    name: 'test-sales',
    columns: [
      { field: 'date', label: 'Date', type: ColumnType.DATE, sortable: true, filterable: true },
      { field: 'customer', label: 'Customer', type: ColumnType.STRING, sortable: true, filterable: true },
      { field: 'quantity', label: 'Qty', type: ColumnType.INTEGER, sortable: true, aggregatable: true },
      { field: 'unitPrice', label: 'Unit Price', type: ColumnType.CURRENCY, aggregatable: true },
      { field: 'status', label: 'Status', type: ColumnType.ENUM, filterable: true, enumValues: ['paid', 'pending', 'cancelled'] },
      {
        field: 'total',
        label: 'Total',
        type: ColumnType.CURRENCY,
        computed: true,
        expression: { op: 'multiply', left: 'quantity', right: 'unitPrice' },
        dependsOn: ['quantity', 'unitPrice'],
        aggregatable: true,
      } satisfies ComputedColumnDefinition,
    ],
    dateField: 'date',
    defaultDateRange: DateRangePreset.THIS_MONTH,
    maxPreviewRows: 3,
  };
}

class MockDataSource implements IReportDataSource {
  private data: Record<string, unknown>[];
  constructor(data: Record<string, unknown>[]) {
    this.data = data;
  }

  async count(_filters: FilterGroup | undefined, _context: OperationContext): Promise<number> {
    return this.data.length;
  }

  async fetchRows(query: ReportQuery, _context: OperationContext): Promise<readonly Record<string, unknown>[]> {
    const rows = [...this.data];

    if (query.sorting && query.sorting.length > 0) {
      const sort = query.sorting[0]!;
      rows.sort((a, b) => {
        const va = a[sort.field] as string | number;
        const vb = b[sort.field] as string | number;
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sort.direction === 'desc' ? -cmp : cmp;
      });
    }

    const offset = (query.pagination.page - 1) * query.pagination.pageSize;
    return rows.slice(offset, offset + query.pagination.pageSize);
  }

  async fetchAggregates(query: AggregateQuery, _context: OperationContext): Promise<readonly AggregationResult[]> {
    return query.aggregations.map((agg) => {
      const values = this.data.map((r) => Number(r[agg.field]) || 0);
      let value = 0;
      switch (agg.type) {
        case AggregationType.SUM:
          value = values.reduce((a, b) => a + b, 0);
          break;
        case AggregationType.AVG:
          value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          break;
        case AggregationType.COUNT:
          value = values.length;
          break;
        case AggregationType.MIN:
          value = Math.min(...values);
          break;
        case AggregationType.MAX:
          value = Math.max(...values);
          break;
      }
      return { field: agg.field, type: agg.type, value };
    });
  }

  availableFields(): readonly string[] {
    return ['date', 'customer', 'quantity', 'unitPrice', 'status'];
  }
}

// ─── Service Factory ──────────────────────────────────────────────────

function createTestService(opts?: {
  permission?: string;
  authorizationResult?: boolean;
}) {
  const defRegistry = new ReportDefinitionRegistry();
  const dsRegistry = new ReportDataSourceRegistry();
  const history = new InMemoryReportHistory();
  const savedStore = new InMemorySavedReportStore();

  const def = makeSalesDefinition();
  if (opts?.permission) {
    (def as Record<string, unknown>)['permission'] = opts.permission;
  }
  defRegistry.register('test-sales', def);
  dsRegistry.register('test-sales', new MockDataSource(SALES_DATA as Record<string, unknown>[]));

  const authorization = opts?.permission
    ? { can: vi.fn().mockReturnValue(opts?.authorizationResult ?? true) }
    : undefined;

  const eventBus = {
    emit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  };

  const service = new ReportService({
    definitionRegistry: defRegistry,
    datasourceRegistry: dsRegistry,
    history,
    savedReportStore: savedStore,
    authorization,
    eventBus,
  });

  return { service, defRegistry, dsRegistry, history, savedStore, eventBus, authorization };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('ReportService Integration', () => {
  describe('getMetadata', () => {
    it('returns metadata for registered definition', () => {
      const { service } = createTestService();
      const meta = service.getMetadata('test-sales');
      expect(meta.name).toBe('test-sales');
      expect(meta.filterableFields.length).toBe(3);
      expect(meta.sortableFields).toContain('date');
      expect(meta.aggregatableFields.length).toBeGreaterThan(0);
    });

    it('throws for unknown definition', () => {
      const { service } = createTestService();
      expect(() => service.getMetadata('nope')).toThrow(ReportNotFoundError);
    });
  });

  describe('preview', () => {
    it('returns limited rows', async () => {
      const { service } = createTestService();
      const result = await service.preview('test-sales', { definitionName: 'test-sales' }, CTX);
      expect(result.isPreview).toBe(true);
      expect(result.rows.length).toBeLessThanOrEqual(3);
    });

    it('resolves computed columns', async () => {
      const { service } = createTestService();
      const result = await service.preview('test-sales', { definitionName: 'test-sales' }, CTX);
      const row = result.rows[0]!;
      expect(row['total']).toBe(Number(row['quantity']) * Number(row['unitPrice']));
    });
  });

  describe('run', () => {
    it('returns full result with rows and timing', async () => {
      const { service } = createTestService();
      const result = await service.run('test-sales', { definitionName: 'test-sales' }, CTX);
      expect('rows' in result).toBe(true);
      if ('rows' in result) {
        expect(result.rows.length).toBe(5);
        expect(result.total).toBe(5);
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
        expect(result.generatedAt).toBeTruthy();
      }
    });

    it('emits completed event', async () => {
      const { service, eventBus } = createTestService();
      await service.run('test-sales', { definitionName: 'test-sales' }, CTX);
      expect(eventBus.emit).toHaveBeenCalledWith(
        'report.completed',
        expect.objectContaining({ definitionName: 'test-sales', tenantId: TENANT }),
      );
    });

    it('applies sorting', async () => {
      const { service } = createTestService();
      const result = await service.run('test-sales', {
        definitionName: 'test-sales',
        sorting: [{ field: 'customer', direction: 'asc' }],
      }, CTX);

      if ('rows' in result) {
        const customers = result.rows.map((r) => r['customer']);
        expect(customers[0]).toBe('Alice');
      }
    });

    it('applies pagination', async () => {
      const { service } = createTestService();
      const result = await service.run('test-sales', {
        definitionName: 'test-sales',
        pagination: { page: 1, pageSize: 2 },
      }, CTX);

      if ('rows' in result) {
        expect(result.rows.length).toBe(2);
        expect(result.page).toBe(1);
        expect(result.totalPages).toBe(3);
      }
    });

    it('applies aggregations', async () => {
      const { service } = createTestService();
      const result = await service.run('test-sales', {
        definitionName: 'test-sales',
        aggregations: [{ field: 'quantity', type: AggregationType.SUM }],
      }, CTX);

      if ('rows' in result && result.aggregations) {
        const sumAgg = result.aggregations.find((a) => a.field === 'quantity');
        expect(sumAgg?.value).toBe(21);
      }
    });

    it('throws for unknown definition', async () => {
      const { service } = createTestService();
      await expect(service.run('nope', { definitionName: 'nope' }, CTX))
        .rejects.toThrow(ReportNotFoundError);
    });
  });

  describe('authorization', () => {
    it('blocks unauthorized access', async () => {
      const { service } = createTestService({
        permission: 'reports.sales.view',
        authorizationResult: false,
      });
      await expect(service.run('test-sales', { definitionName: 'test-sales' }, CTX))
        .rejects.toThrow(ReportAuthorizationError);
    });

    it('allows authorized access', async () => {
      const { service, authorization } = createTestService({
        permission: 'reports.sales.view',
        authorizationResult: true,
      });
      const result = await service.run('test-sales', { definitionName: 'test-sales' }, CTX);
      expect('rows' in result).toBe(true);
      expect(authorization!.can).toHaveBeenCalledWith('reports.sales.view', { tenantId: TENANT });
    });
  });

  describe('saved reports', () => {
    it('saves and lists reports', async () => {
      const { service } = createTestService();

      const saved = await service.saveReport({
        tenantId: TENANT,
        userId: USER,
        definitionName: 'test-sales',
        name: 'My Monthly Sales',
        request: { definitionName: 'test-sales' },
      });

      expect(saved.id).toBeTruthy();
      expect(saved.name).toBe('My Monthly Sales');

      const list = await service.listSavedReports(TENANT);
      expect(list).toHaveLength(1);
      expect(list[0]!.id).toBe(saved.id);
    });

    it('runs saved report', async () => {
      const { service } = createTestService();

      const saved = await service.saveReport({
        tenantId: TENANT,
        userId: USER,
        definitionName: 'test-sales',
        name: 'Quick Sales',
        request: {
          definitionName: 'test-sales',
          pagination: { page: 1, pageSize: 2 },
        },
      });

      const result = await service.runSaved(saved.id, CTX);
      if ('rows' in result) {
        expect(result.rows.length).toBe(2);
      }
    });

    it('throws running unknown saved report', async () => {
      const { service } = createTestService();
      await expect(service.runSaved('nonexistent', CTX)).rejects.toThrow(ReportNotFoundError);
    });
  });

  describe('cancel', () => {
    it('cancels a queued report', async () => {
      const { service, history } = createTestService();

      await history.create({
        id: 'report-1',
        tenantId: TENANT,
        userId: USER,
        definitionName: 'test-sales',
        status: 'QUEUED' as const,
        createdAt: new Date().toISOString(),
      });

      await service.cancel('report-1');
      const record = await service.getStatus('report-1');
      expect(record.status).toBe('CANCELLED');
    });

    it('throws for unknown report', async () => {
      const { service } = createTestService();
      await expect(service.cancel('nope')).rejects.toThrow(ReportNotFoundError);
    });
  });

  describe('registries', () => {
    it('lists registered definitions', () => {
      const { defRegistry } = createTestService();
      expect(defRegistry.list()).toContain('test-sales');
    });

    it('returns undefined for unregistered', () => {
      const { defRegistry, dsRegistry } = createTestService();
      expect(defRegistry.get('nope')).toBeUndefined();
      expect(dsRegistry.get('nope')).toBeUndefined();
    });
  });

  describe('filters in run', () => {
    it('passes filters to datasource without error', async () => {
      const { service } = createTestService();
      const result = await service.run('test-sales', {
        definitionName: 'test-sales',
        filters: FilterBuilder.and(FilterBuilder.eq('customer', 'Alice')),
      }, CTX);
      expect('rows' in result).toBe(true);
    });
  });
});
