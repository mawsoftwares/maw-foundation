import { AppError, ErrorCode } from '@mawsoftwares/sdk';

export const ImportExportErrorCode = {
  IMPORT_FAILED: 'IMPORT_FAILED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  PARSE_ERROR: 'PARSE_ERROR',
  MAPPING_ERROR: 'MAPPING_ERROR',
  FILE_VALIDATION_ERROR: 'FILE_VALIDATION_ERROR',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
} as const;

export class ImportError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.INTERNAL, message, 500, { errorType: ImportExportErrorCode.IMPORT_FAILED, ...details });
    this.name = 'ImportError';
  }
}

export class ExportError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.INTERNAL, message, 500, { errorType: ImportExportErrorCode.EXPORT_FAILED, ...details });
    this.name = 'ExportError';
  }
}

export class ParserError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.INVALID_INPUT, message, 400, { errorType: ImportExportErrorCode.PARSE_ERROR, ...details });
    this.name = 'ParserError';
  }
}

export class MappingError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_FAILED, message, 400, { errorType: ImportExportErrorCode.MAPPING_ERROR, ...details });
    this.name = 'MappingError';
  }
}

export class FileValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_FAILED, message, 400, { errorType: ImportExportErrorCode.FILE_VALIDATION_ERROR, ...details });
    this.name = 'FileValidationError';
  }
}

export class UnsupportedFormatError extends AppError {
  constructor(format: string) {
    super(ErrorCode.INVALID_INPUT, `Unsupported format: ${format}`, 400, { errorType: ImportExportErrorCode.UNSUPPORTED_FORMAT, format });
    this.name = 'UnsupportedFormatError';
  }
}

export class DuplicateError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.CONFLICT, message, 409, { errorType: ImportExportErrorCode.DUPLICATE_ERROR, ...details });
    this.name = 'DuplicateError';
  }
}

export class ProcessingError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.INTERNAL, message, 500, { errorType: ImportExportErrorCode.PROCESSING_ERROR, ...details });
    this.name = 'ProcessingError';
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(ErrorCode.OPERATION_NOT_ALLOWED, `Invalid state transition: ${from} → ${to}`, 400, {
      errorType: ImportExportErrorCode.INVALID_STATE_TRANSITION,
      from,
      to,
    });
    this.name = 'InvalidStateTransitionError';
  }
}
