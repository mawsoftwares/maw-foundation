export interface QueryBuilderResult {
  sql: string;
  params: unknown[];
  nextParamIndex: number;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  direction?: 'asc' | 'desc';
  allowedSortColumns?: string[];
}

export class QueryBuilder {
  private conditions: string[] = [];
  private values: unknown[] = [];
  private paramIndex: number;

  constructor(startIndex = 1) {
    this.paramIndex = startIndex;
  }

  where(column: string, value: unknown): this {
    this.conditions.push(`${column} = $${this.paramIndex}`);
    this.values.push(value);
    this.paramIndex++;
    return this;
  }

  whereOp(column: string, op: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'LIKE' | 'ILIKE', value: unknown): this {
    this.conditions.push(`${column} ${op} $${this.paramIndex}`);
    this.values.push(value);
    this.paramIndex++;
    return this;
  }

  whereNull(column: string): this {
    this.conditions.push(`${column} IS NULL`);
    return this;
  }

  whereNotNull(column: string): this {
    this.conditions.push(`${column} IS NOT NULL`);
    return this;
  }

  whereIn(column: string, values: unknown[]): this {
    if (values.length === 0) {
      this.conditions.push('FALSE');
      return this;
    }
    const placeholders = values.map((_, i) => `$${this.paramIndex + i}`).join(', ');
    this.conditions.push(`${column} IN (${placeholders})`);
    this.values.push(...values);
    this.paramIndex += values.length;
    return this;
  }

  whereRaw(sql: string, params: unknown[] = []): this {
    this.conditions.push(sql);
    this.values.push(...params);
    this.paramIndex += params.length;
    return this;
  }

  build(): QueryBuilderResult {
    const sql = this.conditions.length > 0
      ? `WHERE ${this.conditions.join(' AND ')}`
      : '';
    return { sql, params: this.values, nextParamIndex: this.paramIndex };
  }

  buildWithPagination(options: PaginationOptions): QueryBuilderResult {
    const { sql: whereSql, params } = this.build();
    const parts = [whereSql];

    if (options.orderBy) {
      const safeColumn = options.allowedSortColumns
        ? safeSortColumn(options.orderBy, options.allowedSortColumns)
        : options.orderBy;
      if (safeColumn) {
        const dir = options.direction === 'desc' ? 'DESC' : 'ASC';
        parts.push(`ORDER BY ${safeColumn} ${dir}`);
      }
    }

    if (options.limit !== undefined) {
      parts.push(`LIMIT $${this.paramIndex}`);
      params.push(options.limit);
      this.paramIndex++;
    }

    if (options.offset !== undefined) {
      parts.push(`OFFSET $${this.paramIndex}`);
      params.push(options.offset);
      this.paramIndex++;
    }

    return { sql: parts.filter(Boolean).join(' '), params, nextParamIndex: this.paramIndex };
  }
}

export function safeSortColumn(column: string, allowed: string[]): string | null {
  return allowed.includes(column) ? column : null;
}
