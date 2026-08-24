export interface DuplicateCheckResult {
  readonly duplicates: readonly DuplicateMatch[];
  readonly uniqueCount: number;
  readonly duplicateCount: number;
}

export interface DuplicateMatch {
  readonly rowNumber: number;
  readonly duplicateOfRow?: number;
  readonly keys: Record<string, unknown>;
}

export interface IDuplicateChecker<T = Record<string, unknown>> {
  check(rows: readonly T[], keys: readonly string[]): Promise<DuplicateCheckResult>;
}
