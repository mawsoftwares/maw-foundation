import {
  ReportService,
  ReportDefinitionRegistry,
  ReportDataSourceRegistry,
  InMemoryReportHistory,
  InMemorySavedReportStore,
  ColumnType,
  type ReportDefinition,
  type IReportDataSource,
  type ReportQuery,
  type AggregateQuery,
  type AggregationResult,
  type OperationContext,
  type FilterCondition,
  type FilterGroup,
  isFilterGroup,
} from '@mawsoftwares/reporting';

const SAMPLE_ORDERS = Array.from({ length: 200 }, (_, i) => ({
  id: `ORD-${String(i + 1).padStart(4, '0')}`,
  date: new Date(2025, Math.floor(i / 20), (i % 28) + 1).toISOString(),
  customer: ['Alice Corp', 'Bob Ltd', 'Charlie Inc', 'Delta GmbH', 'Echo SA'][i % 5]!,
  product: ['Widget A', 'Widget B', 'Gadget X', 'Gadget Y', 'Module Z'][i % 5]!,
  category: ['Electronics', 'Hardware', 'Software'][i % 3]!,
  quantity: ((i % 10) + 1) * 5,
  unitPrice: [1200, 2500, 800, 3500, 1800][i % 5]!,
  total: ((i % 10) + 1) * 5 * [1200, 2500, 800, 3500, 1800][i % 5]!,
  status: ['completed', 'pending', 'shipped', 'cancelled'][i % 4]!,
  region: ['North', 'South', 'East', 'West'][i % 4]!,
}));

type OrderRow = (typeof SAMPLE_ORDERS)[number];

function matchesFilter(row: Record<string, unknown>, filter: FilterCondition | FilterGroup): boolean {
  if (isFilterGroup(filter)) {
    const results = filter.conditions.map((c) => matchesFilter(row, c));
    return filter.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }
  const value = row[filter.field];
  switch (filter.operator) {
    case 'eq': return value === filter.value;
    case 'neq': return value !== filter.value;
    case 'gt': return typeof value === 'number' && value > (filter.value as number);
    case 'gte': return typeof value === 'number' && value >= (filter.value as number);
    case 'lt': return typeof value === 'number' && value < (filter.value as number);
    case 'lte': return typeof value === 'number' && value <= (filter.value as number);
    case 'contains': return typeof value === 'string' && value.toLowerCase().includes(String(filter.value).toLowerCase());
    case 'in': return Array.isArray(filter.value) && (filter.value as unknown[]).includes(value);
    default: return true;
  }
}

function applyFiltersAndSort(rows: OrderRow[], query: { filters?: FilterGroup; sorting?: readonly { field: string; direction: string }[] }): OrderRow[] {
  let result = [...rows];
  if (query.filters) {
    result = result.filter((r) => matchesFilter(r as unknown as Record<string, unknown>, query.filters!));
  }
  if (query.sorting && query.sorting.length > 0) {
    result.sort((a, b) => {
      for (const s of query.sorting!) {
        const av = (a as unknown as Record<string, unknown>)[s.field];
        const bv = (b as unknown as Record<string, unknown>)[s.field];
        const cmp = av! < bv! ? -1 : av! > bv! ? 1 : 0;
        if (cmp !== 0) return s.direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }
  return result;
}

const FIELDS = ['id', 'date', 'customer', 'product', 'category', 'quantity', 'unitPrice', 'total', 'status', 'region'];

const ordersDatasource: IReportDataSource = {
  async fetchRows(query: ReportQuery, _context: OperationContext) {
    const rows = applyFiltersAndSort(SAMPLE_ORDERS, query);
    const offset = (query.pagination.page - 1) * query.pagination.pageSize;
    return rows.slice(offset, offset + query.pagination.pageSize);
  },

  async fetchAggregates(query: AggregateQuery, _context: OperationContext): Promise<readonly AggregationResult[]> {
    const rows = applyFiltersAndSort(SAMPLE_ORDERS, query);
    return query.aggregations.map((agg) => {
      const values = rows.map((r) => (r as unknown as Record<string, unknown>)[agg.field] as number).filter((v) => typeof v === 'number');
      let value: number;
      switch (agg.type) {
        case 'SUM': value = values.reduce((s, v) => s + v, 0); break;
        case 'AVG': value = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0; break;
        case 'MIN': value = values.length > 0 ? Math.min(...values) : 0; break;
        case 'MAX': value = values.length > 0 ? Math.max(...values) : 0; break;
        case 'COUNT': value = values.length; break;
        default: value = 0;
      }
      return { field: agg.field, type: agg.type, value };
    });
  },

  async count(filters, _context) {
    if (!filters) return SAMPLE_ORDERS.length;
    return SAMPLE_ORDERS.filter((r) => matchesFilter(r as unknown as Record<string, unknown>, filters)).length;
  },

  availableFields() {
    return FIELDS;
  },
};

const ordersDefinition: ReportDefinition = {
  name: 'orders-report',
  description: 'Sales orders with filtering and aggregation',
  columns: [
    { field: 'id', label: 'Order ID', type: ColumnType.STRING, sortable: true, filterable: true },
    { field: 'date', label: 'Date', type: ColumnType.DATE, sortable: true, filterable: true },
    { field: 'customer', label: 'Customer', type: ColumnType.STRING, sortable: true, filterable: true },
    { field: 'product', label: 'Product', type: ColumnType.STRING, sortable: true, filterable: true },
    { field: 'category', label: 'Category', type: ColumnType.STRING, sortable: true, filterable: true },
    { field: 'quantity', label: 'Qty', type: ColumnType.NUMBER, sortable: true, filterable: true, aggregatable: true },
    { field: 'unitPrice', label: 'Unit Price', type: ColumnType.NUMBER, sortable: true, filterable: true, aggregatable: true },
    { field: 'total', label: 'Total', type: ColumnType.NUMBER, sortable: true, filterable: true, aggregatable: true },
    { field: 'status', label: 'Status', type: ColumnType.STRING, sortable: true, filterable: true },
    { field: 'region', label: 'Region', type: ColumnType.STRING, sortable: true, filterable: true },
  ],
  defaultSort: [{ field: 'date', direction: 'desc' }],
};

export function createReportingService(): ReportService {
  const defRegistry = new ReportDefinitionRegistry();
  const dsRegistry = new ReportDataSourceRegistry();
  const history = new InMemoryReportHistory();
  const savedStore = new InMemorySavedReportStore();

  defRegistry.register('orders-report', ordersDefinition);
  dsRegistry.register('orders-report', ordersDatasource);

  return new ReportService({
    definitionRegistry: defRegistry,
    datasourceRegistry: dsRegistry,
    history,
    savedReportStore: savedStore,
  });
}
