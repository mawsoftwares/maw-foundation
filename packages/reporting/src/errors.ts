import { AppError, ErrorCode } from '@maw/sdk';

export const ReportErrorCode = {
  REPORT_FAILED: 'REPORT_FAILED',
  REPORT_VALIDATION_FAILED: 'REPORT_VALIDATION_FAILED',
  REPORT_AUTHORIZATION_FAILED: 'REPORT_AUTHORIZATION_FAILED',
  REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',
  REPORT_TIMEOUT: 'REPORT_TIMEOUT',
  INVALID_FILTER: 'INVALID_FILTER',
  INVALID_COLUMN: 'INVALID_COLUMN',
  INVALID_SORT: 'INVALID_SORT',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  DATASOURCE_ERROR: 'DATASOURCE_ERROR',
} as const;

export class ReportError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.INTERNAL, message, 500, { errorType: ReportErrorCode.REPORT_FAILED, ...details });
    this.name = 'ReportError';
  }
}

export class ReportValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_FAILED, message, 400, { errorType: ReportErrorCode.REPORT_VALIDATION_FAILED, ...details });
    this.name = 'ReportValidationError';
  }
}

export class ReportAuthorizationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.FORBIDDEN, message, 403, { errorType: ReportErrorCode.REPORT_AUTHORIZATION_FAILED, ...details });
    this.name = 'ReportAuthorizationError';
  }
}

export class ReportNotFoundError extends AppError {
  constructor(reportId: string) {
    super(ErrorCode.NOT_FOUND, `Report not found: ${reportId}`, 404, { errorType: ReportErrorCode.REPORT_NOT_FOUND, reportId });
    this.name = 'ReportNotFoundError';
  }
}

export class InvalidFilterError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.INVALID_INPUT, message, 400, { errorType: ReportErrorCode.INVALID_FILTER, ...details });
    this.name = 'InvalidFilterError';
  }
}

export class InvalidColumnError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.INVALID_INPUT, message, 400, { errorType: ReportErrorCode.INVALID_COLUMN, ...details });
    this.name = 'InvalidColumnError';
  }
}

export class InvalidSortError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.INVALID_INPUT, message, 400, { errorType: ReportErrorCode.INVALID_SORT, ...details });
    this.name = 'InvalidSortError';
  }
}

export class ReportStateTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(ErrorCode.OPERATION_NOT_ALLOWED, `Invalid state transition: ${from} → ${to}`, 400, {
      errorType: ReportErrorCode.INVALID_STATE_TRANSITION,
      from,
      to,
    });
    this.name = 'ReportStateTransitionError';
  }
}

export class DataSourceError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.INTERNAL, message, 500, { errorType: ReportErrorCode.DATASOURCE_ERROR, ...details });
    this.name = 'DataSourceError';
  }
}
