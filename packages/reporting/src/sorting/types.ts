import type { SortDirection } from '../types';

export interface SortField {
  readonly field: string;
  readonly direction: SortDirection;
}
