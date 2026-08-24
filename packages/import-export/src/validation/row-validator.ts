import { required, email, phone, url, minLength, maxLength, minValue, maxValue, pattern } from '@maw/sdk';
import type { ImportDefinition, FieldDefinition, RowError } from '../types';
import { ErrorSeverity, FieldType } from '../types';
import { sanitizeRowValue } from '../security';
import type { RowValidationResult } from './types';

export class RowValidator {
  validate(
    row: Record<string, unknown>,
    rowNumber: number,
    definition: ImportDefinition,
  ): RowValidationResult {
    const errors: RowError[] = [];

    for (const field of definition.fields) {
      const value = row[field.name];
      const fieldErrors = validateField(value, field, rowNumber);
      errors.push(...fieldErrors);
    }

    if (definition.crossFieldValidator) {
      errors.push(...definition.crossFieldValidator(row));
    }

    return { valid: errors.length === 0, errors };
  }
}

function validateField(value: unknown, field: FieldDefinition, rowNumber: number): RowError[] {
  const errors: RowError[] = [];
  const addError = (errorCode: string, message: string) => {
    errors.push({
      rowNumber,
      field: field.name,
      column: field.label,
      value: sanitizeRowValue(value),
      errorCode,
      message,
      severity: ErrorSeverity.ERROR,
    });
  };

  if (field.required) {
    const r = required(value);
    if (!r.valid) {
      addError('REQUIRED', `${field.label} is required`);
      return errors;
    }
  }

  if (value === null || value === undefined || value === '') return errors;

  const strValue = String(value);

  if (field.type === FieldType.EMAIL) {
    const r = email(strValue);
    if (!r.valid) addError('INVALID_EMAIL', `${field.label}: invalid email address`);
  }

  if (field.type === FieldType.PHONE) {
    const r = phone(strValue);
    if (!r.valid) addError('INVALID_PHONE', `${field.label}: invalid phone number`);
  }

  if (field.type === FieldType.URL) {
    const r = url(strValue);
    if (!r.valid) addError('INVALID_URL', `${field.label}: invalid URL`);
  }

  if (field.type === FieldType.NUMBER || field.type === FieldType.INTEGER || field.type === FieldType.DECIMAL) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      addError('INVALID_NUMBER', `${field.label}: must be a number`);
    } else {
      if (field.min !== undefined) {
        const r = minValue(field.min)(value);
        if (!r.valid) addError('MIN_VALUE', r.error!);
      }
      if (field.max !== undefined) {
        const r = maxValue(field.max)(value);
        if (!r.valid) addError('MAX_VALUE', r.error!);
      }
    }
  }

  if (field.type === FieldType.BOOLEAN) {
    if (typeof value !== 'boolean') {
      addError('INVALID_BOOLEAN', `${field.label}: must be a boolean`);
    }
  }

  if (field.type === FieldType.ENUM && field.enumValues) {
    if (!field.enumValues.includes(strValue)) {
      addError('INVALID_ENUM', `${field.label}: must be one of ${field.enumValues.join(', ')}`);
    }
  }

  if (field.minLength !== undefined) {
    const r = minLength(field.minLength)(strValue);
    if (!r.valid) addError('MIN_LENGTH', r.error!);
  }

  if (field.maxLength !== undefined) {
    const r = maxLength(field.maxLength)(strValue);
    if (!r.valid) addError('MAX_LENGTH', r.error!);
  }

  if (field.pattern) {
    const r = pattern(field.pattern, `${field.label}: does not match expected format`)(strValue);
    if (!r.valid) addError('PATTERN_MISMATCH', r.error!);
  }

  if (field.validators) {
    for (const validator of field.validators) {
      const r = validator(value);
      if (!r.valid) {
        addError('CUSTOM_VALIDATION', r.error ?? `${field.label}: validation failed`);
      }
    }
  }

  return errors;
}
