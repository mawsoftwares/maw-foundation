import { describe, it, expect } from 'vitest';
import {
  ReportStatus,
  ColumnType,
  AggregationType,
  DateRangePreset,
} from '../types';
import { validateTransition, canTransition } from '../state-machine';
import { ReportStateTransitionError } from '../errors';
import { FilterBuilder } from '../filters/builder';
import { validateFilters, operatorsForType } from '../filters/validation';
import { InvalidFilterError } from '../errors';
import { validateSorting } from '../sorting/validation';
import { InvalidSortError } from '../errors';
import { resolveDateRange } from '../date-range/resolver';
import { resolveComputedColumns } from '../columns/resolver';
import { validateReportDefinition } from '../definition/validation';
import { extractMetadata } from '../definition/metadata';
import { ReportValidationError } from '../errors';
import type { ReportDefinition, ComputedColumnDefinition } from '../definition/types';
import { FilterOperator } from '@mawsoftwares/sdk';

function makeSalesDefinition(): ReportDefinition {
  return {
    name: 'test-sales',
    columns: [
      { field: 'date', label: 'Date', type: ColumnType.DATE, sortable: true, filterable: true },
      { field: 'customer', label: 'Customer', type: ColumnType.STRING, sortable: true, filterable: true },
      { field: 'quantity', label: 'Qty', type: ColumnType.INTEGER, sortable: true, aggregatable: true },
      { field: 'unitPrice', label: 'Unit Price', type: ColumnType.CURRENCY, aggregatable: true },
      { field: 'status', label: 'Status', type: ColumnType.ENUM, filterable: true, enumValues: ['paid', 'pending', 'cancelled'] },
      { field: 'active', label: 'Active', type: ColumnType.BOOLEAN, filterable: true },
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
  };
}

// ─── State Machine ─────────────────────────────────────────────────────
describe('State Machine', () => {
  it('allows valid transitions', () => {
    expect(canTransition(ReportStatus.PENDING, ReportStatus.VALIDATING)).toBe(true);
    expect(canTransition(ReportStatus.VALIDATING, ReportStatus.PROCESSING)).toBe(true);
    expect(canTransition(ReportStatus.PROCESSING, ReportStatus.COMPLETED)).toBe(true);
    expect(canTransition(ReportStatus.QUEUED, ReportStatus.PROCESSING)).toBe(true);
    expect(canTransition(ReportStatus.PENDING, ReportStatus.CANCELLED)).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransition(ReportStatus.COMPLETED, ReportStatus.PROCESSING)).toBe(false);
    expect(canTransition(ReportStatus.FAILED, ReportStatus.PROCESSING)).toBe(false);
    expect(canTransition(ReportStatus.CANCELLED, ReportStatus.PENDING)).toBe(false);
  });

  it('throws on invalid validateTransition', () => {
    expect(() => validateTransition(ReportStatus.COMPLETED, ReportStatus.PROCESSING))
      .toThrow(ReportStateTransitionError);
  });
});

// ─── FilterBuilder ─────────────────────────────────────────────────────
describe('FilterBuilder', () => {
  it('builds eq condition', () => {
    const f = FilterBuilder.eq('name', 'Alice');
    expect(f).toEqual({ field: 'name', operator: FilterOperator.EQUALS, value: 'Alice' });
  });

  it('builds between condition', () => {
    const f = FilterBuilder.between('amount', 10, 100);
    expect(f).toEqual({ field: 'amount', operator: FilterOperator.BETWEEN, value: [10, 100] });
  });

  it('builds AND group', () => {
    const g = FilterBuilder.and(
      FilterBuilder.eq('a', 1),
      FilterBuilder.gt('b', 5),
    );
    expect(g.logic).toBe('AND');
    expect(g.conditions).toHaveLength(2);
  });

  it('builds OR group', () => {
    const g = FilterBuilder.or(
      FilterBuilder.eq('x', 1),
      FilterBuilder.eq('x', 2),
    );
    expect(g.logic).toBe('OR');
    expect(g.conditions).toHaveLength(2);
  });

  it('builds nested groups', () => {
    const g = FilterBuilder.and(
      FilterBuilder.or(FilterBuilder.eq('a', 1), FilterBuilder.eq('a', 2)),
      FilterBuilder.gt('b', 10),
    );
    expect(g.logic).toBe('AND');
    expect(g.conditions).toHaveLength(2);
  });

  it('builds inValues condition', () => {
    const f = FilterBuilder.inValues('status', ['paid', 'pending']);
    expect(f.operator).toBe(FilterOperator.IN);
    expect(f.value).toEqual(['paid', 'pending']);
  });

  it('builds isEmpty/isNotEmpty', () => {
    expect(FilterBuilder.isEmpty('notes').operator).toBe(FilterOperator.IS_EMPTY);
    expect(FilterBuilder.isNotEmpty('notes').operator).toBe(FilterOperator.IS_NOT_EMPTY);
  });
});

// ─── Filter Validation ────────────────────────────────────────────────
describe('Filter Validation', () => {
  const def = makeSalesDefinition();

  it('passes valid filters', () => {
    const f = FilterBuilder.and(
      FilterBuilder.eq('customer', 'Alice'),
      FilterBuilder.gte('date', '2024-01-01'),
    );
    expect(() => validateFilters(f, def)).not.toThrow();
  });

  it('rejects unknown field', () => {
    const f = FilterBuilder.and(FilterBuilder.eq('nonexistent', 1));
    expect(() => validateFilters(f, def)).toThrow(InvalidFilterError);
  });

  it('rejects invalid operator for type', () => {
    const f = FilterBuilder.and(FilterBuilder.contains('date', 'jan'));
    expect(() => validateFilters(f, def)).toThrow(InvalidFilterError);
  });

  it('rejects explicitly non-filterable field', () => {
    const restrictedDef: ReportDefinition = {
      name: 'restricted',
      columns: [
        { field: 'secret', label: 'Secret', type: ColumnType.STRING, filterable: false },
      ],
    };
    const f = FilterBuilder.and(FilterBuilder.eq('secret', 'x'));
    expect(() => validateFilters(f, restrictedDef)).toThrow(InvalidFilterError);
  });

  it('validates between requires array', () => {
    const f = FilterBuilder.and({ field: 'date', operator: FilterOperator.BETWEEN, value: 'bad' });
    expect(() => validateFilters(f, def)).toThrow(InvalidFilterError);
  });

  it('validates IN requires array', () => {
    const f = FilterBuilder.and({ field: 'status', operator: FilterOperator.IN, value: 'single' });
    expect(() => validateFilters(f, def)).toThrow(InvalidFilterError);
  });
});

// ─── Operators per type ───────────────────────────────────────────────
describe('operatorsForType', () => {
  it('returns string operators', () => {
    const ops = operatorsForType(ColumnType.STRING);
    expect(ops).toContain(FilterOperator.CONTAINS);
    expect(ops).toContain(FilterOperator.STARTS_WITH);
    expect(ops).not.toContain(FilterOperator.GREATER_THAN);
  });

  it('returns numeric operators', () => {
    const ops = operatorsForType(ColumnType.CURRENCY);
    expect(ops).toContain(FilterOperator.GREATER_THAN);
    expect(ops).toContain(FilterOperator.BETWEEN);
    expect(ops).not.toContain(FilterOperator.CONTAINS);
  });

  it('returns boolean operators', () => {
    const ops = operatorsForType(ColumnType.BOOLEAN);
    expect(ops).toEqual([FilterOperator.EQUALS]);
  });

  it('returns enum operators', () => {
    const ops = operatorsForType(ColumnType.ENUM);
    expect(ops).toContain(FilterOperator.IN);
    expect(ops).not.toContain(FilterOperator.GREATER_THAN);
  });
});

// ─── Sort Validation ──────────────────────────────────────────────────
describe('Sort Validation', () => {
  const def = makeSalesDefinition();

  it('passes valid sorts', () => {
    expect(() => validateSorting([{ field: 'date', direction: 'desc' }], def)).not.toThrow();
  });

  it('rejects non-sortable field', () => {
    expect(() => validateSorting([{ field: 'unitPrice', direction: 'asc' }], def)).toThrow(InvalidSortError);
  });

  it('rejects unknown field', () => {
    expect(() => validateSorting([{ field: 'nope', direction: 'asc' }], def)).toThrow(InvalidSortError);
  });
});

// ─── Date Range Resolver ──────────────────────────────────────────────
describe('Date Range Resolver', () => {
  it('resolves TODAY preset', () => {
    const range = resolveDateRange({ preset: DateRangePreset.TODAY, timezone: 'UTC' });
    expect(range.from).toBeInstanceOf(Date);
    expect(range.to).toBeInstanceOf(Date);
    expect(range.from.getTime()).toBeLessThanOrEqual(range.to.getTime());
  });

  it('resolves YESTERDAY preset', () => {
    const range = resolveDateRange({ preset: DateRangePreset.YESTERDAY, timezone: 'UTC' });
    const now = new Date();
    expect(range.to.getDate()).not.toBe(now.getDate());
  });

  it('resolves THIS_MONTH preset', () => {
    const range = resolveDateRange({ preset: DateRangePreset.THIS_MONTH, timezone: 'UTC' });
    expect(range.from.getDate()).toBe(1);
  });

  it('resolves LAST_MONTH preset', () => {
    const range = resolveDateRange({ preset: DateRangePreset.LAST_MONTH, timezone: 'UTC' });
    expect(range.from.getDate()).toBe(1);
    expect(range.to.getTime()).toBeGreaterThanOrEqual(range.from.getTime());
  });

  it('resolves THIS_QUARTER preset', () => {
    const range = resolveDateRange({ preset: DateRangePreset.THIS_QUARTER, timezone: 'UTC' });
    expect(range.from.getMonth() % 3).toBe(0);
  });

  it('resolves THIS_YEAR preset', () => {
    const range = resolveDateRange({ preset: DateRangePreset.THIS_YEAR, timezone: 'UTC' });
    expect(range.from.getMonth()).toBe(0);
    expect(range.from.getDate()).toBe(1);
  });

  it('resolves LAST_YEAR preset', () => {
    const range = resolveDateRange({ preset: DateRangePreset.LAST_YEAR, timezone: 'UTC' });
    expect(range.from.getFullYear()).toBe(new Date().getFullYear() - 1);
    expect(range.to.getMonth()).toBe(11);
    expect(range.to.getDate()).toBe(31);
  });

  it('resolves custom range', () => {
    const range = resolveDateRange({
      preset: DateRangePreset.CUSTOM,
      from: '2024-01-01',
      to: '2024-03-31',
    });
    expect(range.from.getFullYear()).toBe(2024);
    expect(range.to.getMonth()).toBe(2);
  });

  it('rejects custom range without from/to', () => {
    expect(() => resolveDateRange({ preset: DateRangePreset.CUSTOM })).toThrow(ReportValidationError);
  });

  it('rejects from > to', () => {
    expect(() => resolveDateRange({
      preset: DateRangePreset.CUSTOM,
      from: '2024-12-31',
      to: '2024-01-01',
    })).toThrow(ReportValidationError);
  });

  it('resolves THIS_WEEK preset', () => {
    const range = resolveDateRange({ preset: DateRangePreset.THIS_WEEK, timezone: 'UTC' });
    const day = range.from.getDay();
    expect(day).toBe(1); // Monday start
  });

  it('resolves LAST_WEEK preset', () => {
    const range = resolveDateRange({ preset: DateRangePreset.LAST_WEEK, timezone: 'UTC' });
    expect(range.from.getDay()).toBe(1);
    expect(range.from.getTime()).toBeLessThan(range.to.getTime());
  });

  it('resolves LAST_QUARTER preset', () => {
    const range = resolveDateRange({ preset: DateRangePreset.LAST_QUARTER, timezone: 'UTC' });
    expect(range.from.getMonth() % 3).toBe(0);
  });
});

// ─── Computed Columns ─────────────────────────────────────────────────
describe('Computed Columns', () => {
  it('computes multiply', () => {
    const rows = [{ quantity: 5, unitPrice: 1000 }];
    const computed: ComputedColumnDefinition[] = [{
      field: 'total',
      label: 'Total',
      type: ColumnType.CURRENCY,
      computed: true,
      expression: { op: 'multiply', left: 'quantity', right: 'unitPrice' },
      dependsOn: ['quantity', 'unitPrice'],
    }];
    const result = resolveComputedColumns(rows, computed);
    expect(result[0]!['total']).toBe(5000);
  });

  it('computes add', () => {
    const rows = [{ a: 10, b: 20 }];
    const computed: ComputedColumnDefinition[] = [{
      field: 'sum',
      label: 'Sum',
      type: ColumnType.NUMBER,
      computed: true,
      expression: { op: 'add', left: 'a', right: 'b' },
      dependsOn: ['a', 'b'],
    }];
    const result = resolveComputedColumns(rows, computed);
    expect(result[0]!['sum']).toBe(30);
  });

  it('computes subtract', () => {
    const rows = [{ revenue: 10000, cost: 3000 }];
    const computed: ComputedColumnDefinition[] = [{
      field: 'profit',
      label: 'Profit',
      type: ColumnType.CURRENCY,
      computed: true,
      expression: { op: 'subtract', left: 'revenue', right: 'cost' },
      dependsOn: ['revenue', 'cost'],
    }];
    const result = resolveComputedColumns(rows, computed);
    expect(result[0]!['profit']).toBe(7000);
  });

  it('handles divide by zero', () => {
    const rows = [{ a: 100, b: 0 }];
    const computed: ComputedColumnDefinition[] = [{
      field: 'ratio',
      label: 'Ratio',
      type: ColumnType.NUMBER,
      computed: true,
      expression: { op: 'divide', left: 'a', right: 'b' },
      dependsOn: ['a', 'b'],
    }];
    const result = resolveComputedColumns(rows, computed);
    expect(result[0]!['ratio']).toBe(0);
  });

  it('handles nested expressions', () => {
    const rows = [{ price: 1000, qty: 3, discount: 100 }];
    const computed: ComputedColumnDefinition[] = [{
      field: 'net',
      label: 'Net',
      type: ColumnType.CURRENCY,
      computed: true,
      expression: {
        op: 'subtract',
        left: { op: 'multiply', left: 'price', right: 'qty' },
        right: 'discount',
      },
      dependsOn: ['price', 'qty', 'discount'],
    }];
    const result = resolveComputedColumns(rows, computed);
    expect(result[0]!['net']).toBe(2900);
  });

  it('handles null/undefined as 0', () => {
    const rows = [{ a: null, b: undefined }];
    const computed: ComputedColumnDefinition[] = [{
      field: 'sum',
      label: 'Sum',
      type: ColumnType.NUMBER,
      computed: true,
      expression: { op: 'add', left: 'a', right: 'b' },
      dependsOn: ['a', 'b'],
    }];
    const result = resolveComputedColumns(rows, computed);
    expect(result[0]!['sum']).toBe(0);
  });

  it('returns rows unchanged with empty computed columns', () => {
    const rows = [{ a: 1 }];
    expect(resolveComputedColumns(rows, [])).toBe(rows);
  });
});

// ─── Definition Validation ────────────────────────────────────────────
describe('Definition Validation', () => {
  it('passes valid definition', () => {
    expect(() => validateReportDefinition(makeSalesDefinition())).not.toThrow();
  });

  it('rejects empty name', () => {
    expect(() => validateReportDefinition({ ...makeSalesDefinition(), name: '' }))
      .toThrow(ReportValidationError);
  });

  it('rejects empty columns', () => {
    expect(() => validateReportDefinition({ ...makeSalesDefinition(), columns: [] }))
      .toThrow(ReportValidationError);
  });

  it('rejects duplicate field names', () => {
    const def = {
      ...makeSalesDefinition(),
      columns: [
        { field: 'a', label: 'A', type: ColumnType.STRING },
        { field: 'a', label: 'A2', type: ColumnType.STRING },
      ],
    };
    expect(() => validateReportDefinition(def)).toThrow(ReportValidationError);
  });

  it('rejects aggregatable non-numeric field', () => {
    const def = {
      ...makeSalesDefinition(),
      columns: [{ field: 'name', label: 'Name', type: ColumnType.STRING, aggregatable: true }],
    };
    expect(() => validateReportDefinition(def)).toThrow(ReportValidationError);
  });

  it('rejects invalid dateField', () => {
    const def = { ...makeSalesDefinition(), dateField: 'nonexistent' };
    expect(() => validateReportDefinition(def)).toThrow(ReportValidationError);
  });

  it('rejects dateField on non-date column', () => {
    const def = { ...makeSalesDefinition(), dateField: 'customer' };
    expect(() => validateReportDefinition(def)).toThrow(ReportValidationError);
  });

  it('rejects computed column with unknown dependency', () => {
    const def: ReportDefinition = {
      name: 'test',
      columns: [
        { field: 'a', label: 'A', type: ColumnType.NUMBER },
        {
          field: 'c',
          label: 'C',
          type: ColumnType.NUMBER,
          computed: true,
          expression: { op: 'add', left: 'a', right: 'missing' },
          dependsOn: ['a', 'missing'],
        } satisfies ComputedColumnDefinition,
      ],
    };
    expect(() => validateReportDefinition(def)).toThrow(ReportValidationError);
  });
});

// ─── Metadata ─────────────────────────────────────────────────────────
describe('Metadata Extraction', () => {
  it('extracts metadata from definition', () => {
    const meta = extractMetadata(makeSalesDefinition());
    expect(meta.name).toBe('test-sales');
    expect(meta.filterableFields.length).toBeGreaterThan(0);
    expect(meta.sortableFields).toContain('date');
    expect(meta.aggregatableFields.length).toBeGreaterThan(0);
    expect(meta.dateField).toBe('date');
    expect(meta.dateRangePresets.length).toBeGreaterThan(0);
  });

  it('provides correct operators per field type', () => {
    const meta = extractMetadata(makeSalesDefinition());
    const customerFilter = meta.filterableFields.find((f) => f.field === 'customer');
    expect(customerFilter?.operators).toContain(FilterOperator.CONTAINS);

    const statusFilter = meta.filterableFields.find((f) => f.field === 'status');
    expect(statusFilter?.operators).toContain(FilterOperator.IN);
    expect(statusFilter?.enumValues).toEqual(['paid', 'pending', 'cancelled']);
  });

  it('includes aggregation types for numeric fields', () => {
    const meta = extractMetadata(makeSalesDefinition());
    const qtyAgg = meta.aggregatableFields.find((f) => f.field === 'quantity');
    expect(qtyAgg?.allowedAggregations).toContain(AggregationType.SUM);
    expect(qtyAgg?.allowedAggregations).toContain(AggregationType.AVG);
  });

  it('returns empty dateRangePresets when no dateField', () => {
    const def = { ...makeSalesDefinition(), dateField: undefined };
    const meta = extractMetadata(def);
    expect(meta.dateRangePresets).toEqual([]);
  });

  it('returns default export formats', () => {
    const meta = extractMetadata(makeSalesDefinition());
    expect(meta.exportFormats.length).toBeGreaterThan(0);
  });
});
