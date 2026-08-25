export interface GroupingRequest {
  readonly fields: readonly string[];
}

export interface GroupedRow {
  readonly groupKey: Record<string, unknown>;
  readonly rows: readonly Record<string, unknown>[];
  readonly aggregations?: Record<string, unknown>;
  readonly subgroups?: readonly GroupedRow[];
}
