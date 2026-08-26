import { AppError, ErrorCode } from '@maw/sdk/kernel/errors';

export interface PgError {
  code: string;
  constraint?: string;
  detail?: string;
  table?: string;
  column?: string;
  message?: string;
}

export function isPgError(err: unknown): err is PgError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as PgError).code === 'string'
  );
}

export function translatePgError(err: PgError): AppError {
  switch (err.code) {
    case '23505':
      return new AppError(
        ErrorCode.ALREADY_EXISTS,
        err.detail ?? `Unique constraint violated${err.constraint ? `: ${err.constraint}` : ''}`,
      );
    case '23503':
      return new AppError(
        ErrorCode.CONFLICT,
        err.detail ?? `Foreign key violation${err.constraint ? `: ${err.constraint}` : ''}`,
      );
    case '23514':
      return new AppError(
        ErrorCode.VALIDATION_FAILED,
        err.detail ?? `Check constraint violated${err.constraint ? `: ${err.constraint}` : ''}`,
      );
    case '40001':
      return new AppError(ErrorCode.CONFLICT, 'Serialization failure — retry the transaction');
    case '40P01':
      return new AppError(ErrorCode.CONFLICT, 'Deadlock detected — retry the transaction');
    case '57014':
      return new AppError(ErrorCode.TIMEOUT, 'Statement cancelled due to timeout');
    default:
      return new AppError(
        ErrorCode.INTERNAL,
        `Database error (${err.code}): ${err.message ?? 'unknown'}`,
      );
  }
}

export async function withPgErrorTranslation<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isPgError(err)) {
      throw translatePgError(err);
    }
    throw err;
  }
}
