import type { Logger } from '@maw/sdk';
import { createLogger } from '@maw/sdk';
import type { ReportDefinition, ComputedColumnDefinition } from '../definition/types';
import { isComputedColumn } from '../definition/types';
import type { IReportDataSource } from '../datasource/types';
import type { OperationContext } from '../types';
import type { ReportRequest, ReportResult, ReportPreviewResult } from './types';
import type { FilterGroup } from '../filters/types';
import type { AggregationResult } from '../aggregation/types';
import { FilterBuilder } from '../filters/builder';
import { resolveDateRange } from '../date-range/resolver';
import { resolveComputedColumns } from '../columns/resolver';

export interface ReportExecutorOptions {
  readonly logger?: Logger;
}

export class ReportExecutor {
  private readonly logger: Logger;

  constructor(options?: ReportExecutorOptions) {
    this.logger = options?.logger ?? createLogger('report-executor');
  }

  async execute(
    definition: ReportDefinition,
    request: ReportRequest,
    datasource: IReportDataSource,
    context: OperationContext,
    options?: { preview?: boolean },
  ): Promise<ReportResult | ReportPreviewResult> {
    const startTime = Date.now();
    const isPreview = options?.preview ?? false;

    const mergedFilters = this.buildFilters(definition, request);

    const page = request.pagination?.page ?? 1;
    const pageSize = isPreview
      ? (definition.maxPreviewRows ?? 25)
      : (request.pagination?.pageSize ?? 50);

    const total = await datasource.count(mergedFilters, context);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const rows = await datasource.fetchRows(
      {
        filters: mergedFilters,
        sorting: request.sorting ?? definition.defaultSort,
        pagination: { page, pageSize },
      },
      context,
    );

    const computedColumns = definition.columns.filter(isComputedColumn) as ComputedColumnDefinition[];
    const enrichedRows = resolveComputedColumns(rows as Record<string, unknown>[], computedColumns);

    let aggregations: readonly AggregationResult[] | undefined;
    if (request.aggregations && request.aggregations.length > 0) {
      aggregations = await datasource.fetchAggregates(
        {
          filters: mergedFilters,
          aggregations: request.aggregations,
          grouping: request.grouping,
        },
        context,
      );
    }

    let summary: readonly AggregationResult[] | undefined;
    if (definition.summaryAggregations && definition.summaryAggregations.length > 0) {
      summary = await datasource.fetchAggregates(
        {
          filters: mergedFilters,
          aggregations: definition.summaryAggregations,
        },
        context,
      );
    }

    const executionTimeMs = Date.now() - startTime;
    const reportId = crypto.randomUUID();

    this.logger.info('Report executed', {
      reportId,
      definitionName: definition.name,
      total,
      page,
      pageSize,
      executionTimeMs,
      isPreview,
    });

    const result: ReportResult = {
      reportId,
      definitionName: definition.name,
      rows: enrichedRows,
      total,
      page,
      pageSize,
      totalPages,
      aggregations,
      summary,
      executionTimeMs,
      generatedAt: new Date().toISOString(),
    };

    if (isPreview) {
      return { ...result, isPreview: true };
    }

    return result;
  }

  private buildFilters(
    definition: ReportDefinition,
    request: ReportRequest,
  ): FilterGroup | undefined {
    const parts: FilterGroup[] = [];

    if (definition.defaultFilters) {
      parts.push(definition.defaultFilters);
    }

    if (request.filters) {
      parts.push(request.filters);
    }

    if (request.dateRange && definition.dateField) {
      const range = resolveDateRange(request.dateRange);
      const dateFilter = FilterBuilder.and(
        FilterBuilder.gte(definition.dateField, range.from.toISOString()),
        FilterBuilder.lte(definition.dateField, range.to.toISOString()),
      );
      parts.push(dateFilter);
    }

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return FilterBuilder.and(...parts);
  }
}
