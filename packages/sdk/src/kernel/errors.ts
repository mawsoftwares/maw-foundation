/**
 * Structured error handling — isomorphic base classes and error codes.
 */

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const ErrorCode = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Business
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',

  // System
  INTERNAL: 'INTERNAL',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',

  // Offline
  OFFLINE_UNAVAILABLE: 'OFFLINE_UNAVAILABLE',
  SYNC_FAILED: 'SYNC_FAILED',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  CONFLICT_UNRESOLVED: 'CONFLICT_UNRESOLVED',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

// ---------------------------------------------------------------------------
// Base error class
// ---------------------------------------------------------------------------

export class AppError extends Error {
  readonly code: ErrorCodeValue;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCodeValue,
    message: string,
    statusCode?: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode ?? toHttpStatus(code);
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

// ---------------------------------------------------------------------------
// Specialized errors
// ---------------------------------------------------------------------------

export class ValidationError extends AppError {
  readonly fields: Array<{ field: string; error: string }>;

  constructor(fields: Array<{ field: string; error: string }>, message = 'Validation failed') {
    super(ErrorCode.VALIDATION_FAILED, message, 400, { fields });
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} "${id}" not found` : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, msg, 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(ErrorCode.FORBIDDEN, message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCode.CONFLICT, message, 409);
    this.name = 'ConflictError';
  }
}

export class SyncError extends AppError {
  readonly entityType?: string;
  readonly entityId?: string;

  constructor(message: string, details?: { entityType?: string; entityId?: string }) {
    super(ErrorCode.SYNC_FAILED, message, 502, details as Record<string, unknown>);
    this.name = 'SyncError';
    this.entityType = details?.entityType;
    this.entityId = details?.entityId;
  }
}

// ---------------------------------------------------------------------------
// Code → HTTP status mapping
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<ErrorCodeValue, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TOKEN_EXPIRED: 401,
  INVALID_CREDENTIALS: 401,
  SESSION_EXPIRED: 401,
  VALIDATION_FAILED: 400,
  INVALID_INPUT: 400,
  MISSING_FIELD: 400,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  CONFLICT: 409,
  INSUFFICIENT_FUNDS: 402,
  LIMIT_EXCEEDED: 429,
  OPERATION_NOT_ALLOWED: 403,
  FEATURE_DISABLED: 403,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
  TIMEOUT: 504,
  NETWORK_ERROR: 502,
  RATE_LIMITED: 429,
  OFFLINE_UNAVAILABLE: 503,
  SYNC_FAILED: 502,
  STORAGE_QUOTA_EXCEEDED: 507,
  CONFLICT_UNRESOLVED: 409,
};

export function toHttpStatus(code: ErrorCodeValue): number {
  return STATUS_MAP[code] ?? 500;
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function ensureError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);
  return new Error(String(value));
}
