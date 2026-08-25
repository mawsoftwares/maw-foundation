import type { DateRangePresetValue } from '../types';

export interface DateRange {
  readonly from: Date;
  readonly to: Date;
  readonly timezone?: string;
}

export interface DateRangeRequest {
  readonly preset?: DateRangePresetValue;
  readonly from?: string;
  readonly to?: string;
  readonly timezone?: string;
}
