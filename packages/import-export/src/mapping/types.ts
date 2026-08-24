export interface ColumnMapping {
  readonly source: string;
  readonly target: string;
}

export interface MappingConfig {
  readonly mappings?: readonly ColumnMapping[];
  readonly autoMap?: boolean;
}

export interface MappingResult {
  readonly mapped: ReadonlyMap<string, string>;
  readonly unmappedColumns: readonly string[];
  readonly missingRequiredFields: readonly string[];
}
