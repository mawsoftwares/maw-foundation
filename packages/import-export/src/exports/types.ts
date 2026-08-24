import type { OperationContext } from '../types';

export interface IExportDataProvider<T = Record<string, unknown>> {
  count(filters: Record<string, unknown>, context: OperationContext): Promise<number>;
  fetch(
    filters: Record<string, unknown>,
    offset: number,
    limit: number,
    context: OperationContext,
  ): Promise<readonly T[]>;
}
