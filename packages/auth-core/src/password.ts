import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { IHasher } from '@mawsoftwares/sdk/contracts/IHasher';

/**
 * Password hashing with Node's built-in scrypt — no native dependency. Format:
 * `scrypt$<saltHex>$<keyHex>`, self-describing so the params travel with the hash.
 * Ported verbatim from Restaurant OS `apps/server/src/auth/password.ts`.
 */
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, keyHex] = stored.split('$');
  if (scheme !== 'scrypt' || saltHex === undefined || keyHex === undefined) return false;

  const expected = Buffer.from(keyHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), KEYLEN);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** `IHasher` adapter, so auth logic depends on the port, not on scrypt directly. */
export const ScryptHasher: IHasher = {
  hash: hashPassword,
  verify: verifyPassword,
};

export {
  validatePassword,
  type PasswordPolicyConfig,
  type PasswordValidationError,
  DEFAULT_PASSWORD_POLICY,
} from '@mawsoftwares/sdk/security/PasswordPolicy';
