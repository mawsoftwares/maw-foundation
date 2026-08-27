import {
  validatePassword,
  type PasswordPolicyConfig,
  type PasswordValidationError,
  DEFAULT_PASSWORD_POLICY,
} from '@mawsoftwares/sdk/security/PasswordPolicy';

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  '1234567890', 'qwerty', 'abc123', 'monkey', 'master', 'dragon', 'login',
  'princess', 'football', 'shadow', 'sunshine', 'trustno1', 'iloveyou',
  'batman', 'access', 'hello', 'charlie', 'donald', 'letmein', 'welcome',
  'admin', 'admin123', 'root', 'toor', 'pass', 'test', 'guest', 'changeme',
  'passw0rd', 'p@ssword', 'p@ssw0rd', 'qwerty123', 'qwertyuiop',
  '111111', '000000', '121212', '654321', '666666', '696969',
  'baseball', 'michael', 'mustang', 'jennifer', 'jordan', 'hunter',
  'ranger', 'buster', 'thomas', 'robert', 'soccer', 'hockey',
  'george', 'andrew', 'harley', 'daniel', 'joshua', 'matthew',
  'starwars', 'silver', 'computer', 'corvette', 'mercedes', 'amanda',
  'summer', 'pepper', 'ashley', 'nicole', 'jessica', 'maggie',
  'freedom', 'thunder', 'austin', 'william', 'dallas', 'yankees',
  'hello123', 'hammer', 'killer', 'falcon', 'knight', 'wizard',
  'anthony', 'patrick', 'richard', 'cookie', 'banana', 'abcdef',
]);

export interface PasswordCheckResult {
  readonly allowed: boolean;
  readonly errors: readonly PasswordValidationError[];
}

export function isPasswordAllowed(
  password: string,
  policy: PasswordPolicyConfig = DEFAULT_PASSWORD_POLICY,
): PasswordCheckResult {
  const errors = [...validatePassword(password, policy)];

  if (policy.preventCommon && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push({ rule: 'preventCommon', message: 'Password is too common' });
  }

  return { allowed: errors.length === 0, errors };
}
