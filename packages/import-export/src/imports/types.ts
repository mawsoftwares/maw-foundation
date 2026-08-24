import type { OperationContext, BatchProcessResult } from '../types';

export interface IImportRowProcessor<T = Record<string, unknown>> {
  processRow(row: T, context: OperationContext): Promise<void>;
  processBatch?(rows: readonly T[], context: OperationContext): Promise<BatchProcessResult>;
}
