export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function mapRow<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    result[snakeToCamel(key)] = row[key];
  }
  return result as T;
}

export function mapRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => mapRow<T>(row));
}

export type FieldMapping<TRow, TEntity> = {
  [K in keyof TEntity]?: keyof TRow | ((row: TRow) => TEntity[K]);
};

export function createRowMapper<TRow extends Record<string, unknown>, TEntity>(
  mappings?: FieldMapping<TRow, TEntity>,
): (row: TRow) => TEntity {
  return (row: TRow) => {
    const base = mapRow<TEntity>(row as Record<string, unknown>);
    if (!mappings) return base;

    const entity = { ...base };
    for (const [entityKey, mapping] of Object.entries(mappings)) {
      if (typeof mapping === 'function') {
        (entity as Record<string, unknown>)[entityKey] = (mapping as (row: TRow) => unknown)(row);
      } else if (typeof mapping === 'string') {
        (entity as Record<string, unknown>)[entityKey] = row[mapping as string];
      }
    }
    return entity;
  };
}

export function dateToIso(value: Date | null): string | null {
  if (value === null) return null;
  return value.toISOString();
}

export function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}
