import type { DuplicateCheckResult, DuplicateMatch, IDuplicateChecker } from './types';

export class InFileDuplicateChecker implements IDuplicateChecker {
  async check(
    rows: readonly Record<string, unknown>[],
    keys: readonly string[],
  ): Promise<DuplicateCheckResult> {
    if (keys.length === 0) {
      return { duplicates: [], uniqueCount: rows.length, duplicateCount: 0 };
    }

    const seen = new Map<string, number>();
    const duplicates: DuplicateMatch[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const compositeKey = buildCompositeKey(row, keys);

      if (compositeKey === null) continue;

      const existingRow = seen.get(compositeKey);
      if (existingRow !== undefined) {
        const keyValues: Record<string, unknown> = {};
        for (const k of keys) keyValues[k] = row[k];
        duplicates.push({ rowNumber: i + 1, duplicateOfRow: existingRow + 1, keys: keyValues });
      } else {
        seen.set(compositeKey, i);
      }
    }

    return {
      duplicates,
      uniqueCount: rows.length - duplicates.length,
      duplicateCount: duplicates.length,
    };
  }
}

function buildCompositeKey(row: Record<string, unknown>, keys: readonly string[]): string | null {
  const parts: string[] = [];
  for (const key of keys) {
    const val = row[key];
    if (val === null || val === undefined || val === '') return null;
    parts.push(String(val).toLowerCase().trim());
  }
  return parts.join('\x00');
}
