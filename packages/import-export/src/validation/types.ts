import type { RowError } from '../types';

export interface RowValidationResult {
  readonly valid: boolean;
  readonly errors: readonly RowError[];
}

export interface FileValidationConfig {
  readonly maxFileSize?: number;
  readonly allowedExtensions?: readonly string[];
  readonly allowedMimeTypes?: readonly string[];
}
