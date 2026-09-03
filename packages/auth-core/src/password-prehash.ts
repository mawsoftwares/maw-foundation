import { isPrehashedPassword, extractPrehash } from '@mawsoftwares/sdk/security/password-prehash';

export const PREHASH_HEADER = 'x-password-prehashed';

/**
 * Resolve the password from a request body. If the client sent a prehashed
 * value (indicated by the `x-password-prehashed: sha256` header), strip the
 * `sha256:` prefix and return the hex digest — this is what scrypt will hash.
 *
 * When `requirePrehash` is true (production), reject plaintext passwords.
 */
export function resolvePassword(
  password: string,
  prehashHeader: string | undefined,
  requirePrehash: boolean,
): string {
  const clientClaimsPrehashed = prehashHeader === 'sha256';

  if (clientClaimsPrehashed) {
    if (!isPrehashedPassword(password)) {
      throw new PrehashFormatError('Header claims prehash but value is not in sha256:<hex> format');
    }
    return extractPrehash(password);
  }

  if (requirePrehash) {
    throw new PrehashRequiredError('Server requires password prehashing. Send SHA-256 digest with x-password-prehashed: sha256 header');
  }

  return password;
}

export class PrehashRequiredError extends Error {
  readonly code = 'PREHASH_REQUIRED';
  constructor(message: string) {
    super(message);
    this.name = 'PrehashRequiredError';
  }
}

export class PrehashFormatError extends Error {
  readonly code = 'PREHASH_FORMAT_INVALID';
  constructor(message: string) {
    super(message);
    this.name = 'PrehashFormatError';
  }
}

export { isPrehashedPassword, extractPrehash } from '@mawsoftwares/sdk/security/password-prehash';
