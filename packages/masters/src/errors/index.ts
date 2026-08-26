import { AppError, ErrorCode } from '@maw/sdk/kernel/errors';

export const MasterErrorCode = {
  MASTER_NOT_FOUND: 'MASTER_NOT_FOUND',
  MASTER_CODE_ALREADY_EXISTS: 'MASTER_CODE_ALREADY_EXISTS',
  MASTER_SYSTEM_PROTECTED: 'MASTER_SYSTEM_PROTECTED',
  MASTER_INACTIVE: 'MASTER_INACTIVE',
  MASTER_VERSION_CONFLICT: 'MASTER_VERSION_CONFLICT',
  FIELD_NOT_FOUND: 'FIELD_NOT_FOUND',
  FIELD_CODE_ALREADY_EXISTS: 'FIELD_CODE_ALREADY_EXISTS',
  VALUE_NOT_FOUND: 'VALUE_NOT_FOUND',
  VALUE_CODE_ALREADY_EXISTS: 'VALUE_CODE_ALREADY_EXISTS',
  REFERENCE_INVALID: 'REFERENCE_INVALID',
} as const;

export type MasterErrorCodeValue = (typeof MasterErrorCode)[keyof typeof MasterErrorCode];

export function masterNotFound(id: string): AppError {
  return new AppError(ErrorCode.NOT_FOUND, `Master not found: ${id}`, 404, { masterId: id });
}

export function masterCodeExists(code: string): AppError {
  return new AppError(ErrorCode.ALREADY_EXISTS, `Master code already exists: ${code}`, 409, { code });
}

export function masterSystemProtected(code: string): AppError {
  return new AppError(ErrorCode.OPERATION_NOT_ALLOWED, `System master cannot be modified: ${code}`, 403, { code });
}

export function masterInactive(code: string): AppError {
  return new AppError(ErrorCode.OPERATION_NOT_ALLOWED, `Master is inactive: ${code}`, 400, { code });
}

export function masterVersionConflict(id: string): AppError {
  return new AppError(ErrorCode.CONFLICT, `Master was modified by another request`, 409, { masterId: id });
}

export function fieldNotFound(id: string): AppError {
  return new AppError(ErrorCode.NOT_FOUND, `Master field not found: ${id}`, 404, { fieldId: id });
}

export function fieldCodeExists(code: string, masterId: string): AppError {
  return new AppError(ErrorCode.ALREADY_EXISTS, `Field code already exists: ${code}`, 409, { code, masterId });
}

export function valueNotFound(id: string): AppError {
  return new AppError(ErrorCode.NOT_FOUND, `Master value not found: ${id}`, 404, { valueId: id });
}

export function valueCodeExists(code: string, masterId: string): AppError {
  return new AppError(ErrorCode.ALREADY_EXISTS, `Value code already exists: ${code}`, 409, { code, masterId });
}

export function referenceInvalid(field: string, referenceMaster: string): AppError {
  return new AppError(ErrorCode.VALIDATION_FAILED, `Invalid reference: field "${field}" references unknown master "${referenceMaster}"`, 400, { field, referenceMaster });
}
