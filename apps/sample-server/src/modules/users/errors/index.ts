import { AppError, ErrorCode, NotFoundError, ValidationError } from '@mawsoftwares/sdk/kernel/errors';
import type { FieldError } from '@mawsoftwares/sdk/kernel/validate';

export function userNotFound(id?: string): NotFoundError {
  return new NotFoundError('User', id);
}

export function userEmailExists(): AppError {
  return new AppError(
    ErrorCode.DUPLICATE_EMAIL,
    'An account with this email already exists',
    409,
    { field: 'email' },
  );
}

export function userPhoneExists(): AppError {
  return new AppError(
    ErrorCode.ALREADY_EXISTS,
    'An account with this phone number already exists',
    409,
    { field: 'phone' },
  );
}

export function userValidationFailed(fields: FieldError[]): ValidationError {
  return new ValidationError(fields);
}

export function userOperationFailed(operation: string): AppError {
  return new AppError(ErrorCode.INTERNAL, `User ${operation} failed`);
}
