export interface SecretValidationOptions {
  readonly jwtSecret: string;
  readonly mfaEncryptionKey?: string;
  /** Skip validation (e.g. in development). Defaults to `process.env.NODE_ENV !== 'production'`. */
  readonly allowInsecure?: boolean;
}

const WEAK_JWT_DEFAULTS = ['dev-only-secret-change-me', 'secret', 'changeme', 'test'];
const ZERO_KEY = '0'.repeat(64);

export function validateSecuritySecrets(opts: SecretValidationOptions): void {
  const skip = opts.allowInsecure ?? process.env.NODE_ENV !== 'production';
  if (skip) return;

  if (opts.jwtSecret.length < 32 || WEAK_JWT_DEFAULTS.includes(opts.jwtSecret)) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters and not a default value in production',
    );
  }

  if (opts.mfaEncryptionKey !== undefined) {
    if (opts.mfaEncryptionKey === ZERO_KEY || !/^[0-9a-fA-F]{64}$/.test(opts.mfaEncryptionKey)) {
      throw new Error(
        'MFA_ENCRYPTION_KEY must be a 64-character hex string and not all zeros in production',
      );
    }
  }
}
