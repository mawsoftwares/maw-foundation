export interface PasswordPolicyConfig {
  readonly minLength: number;
  readonly maxLength: number;
  readonly requireUppercase: boolean;
  readonly requireLowercase: boolean;
  readonly requireNumber: boolean;
  readonly requireSpecial: boolean;
  readonly preventCommon: boolean;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
  preventCommon: true,
};

export interface PasswordValidationError {
  readonly rule: string;
  readonly message: string;
}

export function validatePassword(
  password: string,
  policy: PasswordPolicyConfig = DEFAULT_PASSWORD_POLICY,
): readonly PasswordValidationError[] {
  const errors: PasswordValidationError[] = [];

  if (password.length < policy.minLength) {
    errors.push({ rule: 'minLength', message: `Password must be at least ${policy.minLength} characters` });
  }
  if (password.length > policy.maxLength) {
    errors.push({ rule: 'maxLength', message: `Password must be at most ${policy.maxLength} characters` });
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push({ rule: 'requireUppercase', message: 'Password must contain an uppercase letter' });
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push({ rule: 'requireLowercase', message: 'Password must contain a lowercase letter' });
  }
  if (policy.requireNumber && !/\d/.test(password)) {
    errors.push({ rule: 'requireNumber', message: 'Password must contain a number' });
  }
  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push({ rule: 'requireSpecial', message: 'Password must contain a special character' });
  }

  return errors;
}
