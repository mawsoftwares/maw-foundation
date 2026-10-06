import type { PageRequest, SortDirection } from '../types/storage.types';

export function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toIsoOrNull(value: Date | string | null): string | null {
  return value === null ? null : toIso(value);
}

/** Maps an API sort key to a SQL column through an allow-list — never interpolates user input. */
export function orderBy(
  sortBy: string | undefined,
  direction: SortDirection | undefined,
  columns: Readonly<Record<string, string>>,
  fallback: string,
): string {
  const column = (sortBy !== undefined ? columns[sortBy] : undefined) ?? fallback;
  return `${column} ${direction === 'desc' ? 'DESC' : 'ASC'}`;
}

export function offsetOf({ page, pageSize }: PageRequest): number {
  return (page - 1) * pageSize;
}

/** Escapes `%`, `_` and `\` so user search text is matched literally by ILIKE. */
export function likeContains(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}
