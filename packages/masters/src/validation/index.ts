import {
  required, minLength, maxLength, pattern,
  validateFields, type FieldError, type Validator,
} from '@maw/sdk/kernel/validate';
import { AppError, ErrorCode } from '@maw/sdk/kernel/errors';
import { FieldDataType, type FieldDataTypeValue } from '../types/entities';
import type { CreateMasterInput, CreateFieldInput, CreateValueInput } from '../types/dto';

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,62}[A-Z0-9]$/;
const CODE_MSG = 'Code must be 3-64 chars, UPPER_SNAKE_CASE, start with letter';

const VALID_DATA_TYPES = new Set<string>(Object.values(FieldDataType));

function throwIfInvalid(errors: FieldError[]): void {
  if (errors.length > 0) {
    throw new AppError(
      ErrorCode.VALIDATION_FAILED,
      `Validation failed: ${errors.map((e) => `${e.field}: ${e.error}`).join('; ')}`,
      400,
      { fields: errors },
    );
  }
}

export function validateCreateMaster(input: CreateMasterInput): void {
  const schema: Record<string, Validator[]> = {
    code: [required, minLength(3) as Validator, maxLength(64) as Validator, pattern(CODE_PATTERN, CODE_MSG) as Validator],
    name: [required, minLength(1) as Validator, maxLength(200) as Validator],
  };
  const data: Record<string, unknown> = { code: input.code, name: input.name };
  if (input.description !== undefined) {
    schema['description'] = [maxLength(1000) as Validator];
    data['description'] = input.description;
  }
  throwIfInvalid(validateFields(data, schema));
}

export function validateCreateField(input: CreateFieldInput): void {
  const schema: Record<string, Validator[]> = {
    code: [required, minLength(2) as Validator, maxLength(64) as Validator, pattern(/^[a-z][a-z0-9_]{0,62}[a-z0-9]?$/, 'Code must be lower_snake_case, 2-64 chars') as Validator],
    name: [required, minLength(1) as Validator, maxLength(200) as Validator],
    dataType: [required],
  };
  const data: Record<string, unknown> = { code: input.code, name: input.name, dataType: input.dataType };
  throwIfInvalid(validateFields(data, schema));

  if (!VALID_DATA_TYPES.has(input.dataType)) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, `Invalid data type: ${input.dataType}`, 400, {
      field: 'dataType',
      allowed: Object.values(FieldDataType),
    });
  }

  if (input.dataType === FieldDataType.REFERENCE && !input.config?.referenceMaster) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, 'Reference fields must specify config.referenceMaster', 400);
  }
}

export function validateCreateValue(input: CreateValueInput): void {
  const schema: Record<string, Validator[]> = {
    code: [required, minLength(1) as Validator, maxLength(64) as Validator],
    label: [required, minLength(1) as Validator, maxLength(500) as Validator],
  };
  const data: Record<string, unknown> = { code: input.code, label: input.label };
  throwIfInvalid(validateFields(data, schema));
}

export function isValidDataType(value: string): value is FieldDataTypeValue {
  return VALID_DATA_TYPES.has(value);
}
