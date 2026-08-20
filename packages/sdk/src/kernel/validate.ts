/**
 * Isomorphic validation utilities — composable, pure functions.
 * Each validator returns { valid, error? } for easy chaining.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const OK: ValidationResult = { valid: true };
const fail = (error: string): ValidationResult => ({ valid: false, error });

export type Validator<T = unknown> = (value: T) => ValidationResult;

// ---------------------------------------------------------------------------
// Composing
// ---------------------------------------------------------------------------

export function compose<T>(...validators: Validator<T>[]): Validator<T> {
  return (value: T) => {
    for (const v of validators) {
      const result = v(value);
      if (!result.valid) return result;
    }
    return OK;
  };
}

export function validateAll<T>(value: T, ...validators: Validator<T>[]): ValidationResult[] {
  return validators.map((v) => v(value)).filter((r) => !r.valid);
}

// ---------------------------------------------------------------------------
// Common validators
// ---------------------------------------------------------------------------

export function required(value: unknown): ValidationResult {
  if (value === null || value === undefined) return fail('Required');
  if (typeof value === 'string' && value.trim().length === 0) return fail('Required');
  return OK;
}

export function minLength(min: number): Validator<string> {
  return (value) =>
    value.length < min ? fail(`Must be at least ${min} characters`) : OK;
}

export function maxLength(max: number): Validator<string> {
  return (value) =>
    value.length > max ? fail(`Must be at most ${max} characters`) : OK;
}

export function minValue(min: number): Validator<number> {
  return (value) =>
    value < min ? fail(`Must be at least ${min}`) : OK;
}

export function maxValue(max: number): Validator<number> {
  return (value) =>
    value > max ? fail(`Must be at most ${max}`) : OK;
}

export function pattern(regex: RegExp, message: string): Validator<string> {
  return (value) => (regex.test(value) ? OK : fail(message));
}

// ---------------------------------------------------------------------------
// Format validators
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function email(value: string): ValidationResult {
  return EMAIL_RE.test(value) ? OK : fail('Invalid email address');
}

const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

export function phone(value: string): ValidationResult {
  const digits = value.replace(/[\s\-().]/g, '');
  return PHONE_RE.test(digits) ? OK : fail('Invalid phone number');
}

const URL_RE = /^https?:\/\/.+/;

export function url(value: string): ValidationResult {
  return URL_RE.test(value) ? OK : fail('Invalid URL');
}

export function numeric(value: string): ValidationResult {
  return /^\d+$/.test(value) ? OK : fail('Must contain only digits');
}

export function alphanumeric(value: string): ValidationResult {
  return /^[a-zA-Z0-9]+$/.test(value) ? OK : fail('Must contain only letters and digits');
}

// ---------------------------------------------------------------------------
// Object-level validation
// ---------------------------------------------------------------------------

export type FieldValidators<T> = {
  [K in keyof T]?: Validator<T[K]>[];
};

export interface FieldError {
  field: string;
  error: string;
}

export function validateFields<T extends Record<string, unknown>>(
  data: T,
  schema: FieldValidators<T>,
): FieldError[] {
  const errors: FieldError[] = [];
  for (const field of Object.keys(schema) as (keyof T & string)[]) {
    const validators = schema[field];
    if (!validators) continue;
    for (const v of validators) {
      const result = (v as Validator<unknown>)(data[field]);
      if (!result.valid) {
        errors.push({ field, error: result.error! });
        break;
      }
    }
  }
  return errors;
}

export function isValid<T extends Record<string, unknown>>(
  data: T,
  schema: FieldValidators<T>,
): boolean {
  return validateFields(data, schema).length === 0;
}
