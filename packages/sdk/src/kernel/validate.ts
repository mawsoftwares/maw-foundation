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

// ---------------------------------------------------------------------------
// Phone region profiles (app-configurable via setDefaultPhoneRegion)
// ---------------------------------------------------------------------------

export interface PhoneValidationProfile {
  readonly region: string;
  readonly countryCallingCode?: string;
  readonly minDigits: number;
  readonly maxDigits: number;
  /** Max input characters including optional formatting / country code. */
  readonly inputMaxLength: number;
  readonly placeholder: string;
}

const PHONE_PROFILES: Readonly<Record<string, PhoneValidationProfile>> = {
  IN: {
    region: 'IN',
    countryCallingCode: '91',
    minDigits: 10,
    maxDigits: 10,
    inputMaxLength: 13,
    placeholder: '9876543210',
  },
  INTL: {
    region: 'INTL',
    minDigits: 7,
    maxDigits: 15,
    inputMaxLength: 20,
    placeholder: '+1 234 567 8900',
  },
};

/** Default matches AppConfig.phoneRegion when apps call setDefaultPhoneRegion at boot. */
let defaultPhoneRegion = 'IN';

export function setDefaultPhoneRegion(region: string): void {
  defaultPhoneRegion = region.trim().toUpperCase() || 'IN';
}

export function getDefaultPhoneRegion(): string {
  return defaultPhoneRegion;
}

export function getPhoneProfile(region?: string): PhoneValidationProfile {
  const key = (region ?? defaultPhoneRegion).trim().toUpperCase();
  return PHONE_PROFILES[key] ?? PHONE_PROFILES.INTL!;
}

/** Strip separators; for IN also drop leading +91 / 91 / 0. */
export function normalizePhoneDigits(value: string, region?: string): string {
  const profile = getPhoneProfile(region);
  let digits = value.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);

  if (profile.region === 'IN') {
    if (digits.startsWith('91') && digits.length === 12) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }
  }

  return digits;
}

/**
 * Validates a phone number for the active (or given) region.
 * - `IN`: exactly 10 digits, Indian mobile starts with 6–9
 * - `INTL`: E.164-ish 7–15 digits, first digit 1–9
 */
export function phone(value: string, region?: string): ValidationResult {
  const profile = getPhoneProfile(region);
  const raw = value.replace(/[\s\-().]/g, '');
  if (!/^\+?[0-9]+$/.test(raw)) {
    return fail('Invalid phone number');
  }

  const national = normalizePhoneDigits(value, region);

  if (national.length < profile.minDigits) {
    return fail(`Phone number must be at least ${profile.minDigits} digits`);
  }
  if (national.length > profile.maxDigits) {
    return fail(`Phone number must be at most ${profile.maxDigits} digits`);
  }

  if (profile.region === 'IN') {
    if (!/^[6-9]\d{9}$/.test(national)) {
      return fail('Enter a valid 10-digit Indian mobile number');
    }
    return OK;
  }

  if (!/^[1-9]\d*$/.test(national)) {
    return fail('Invalid phone number');
  }
  return OK;
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
