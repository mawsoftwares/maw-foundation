export interface QueryResult<R> {
  rows: R[];
  rowCount: number | null;
}

export interface PgPool {
  query<R = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<R>>;
}

export interface PgClient extends PgPool {
  release(): void;
}

export interface PgTransactionPool extends PgPool {
  connect(): Promise<PgClient>;
}

export type RowMapper<TRow, TEntity> = (row: TRow) => TEntity;
