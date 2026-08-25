import type { AggregationTypeValue } from '../types';

export interface AggregationRequest {
  readonly field: string;
  readonly type: AggregationTypeValue;
}

export interface AggregationResult {
  readonly field: string;
  readonly type: AggregationTypeValue;
  readonly value: number;
  readonly label?: string;
}
