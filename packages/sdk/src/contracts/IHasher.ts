/**
 * Password hashing port. Implemented by `@maw/auth-core` (scrypt, no native dep).
 * Kept a contract so a product can swap in argon2/bcrypt without touching auth logic.
 */
export interface IHasher {
  hash(plaintext: string): string | Promise<string>;
  verify(plaintext: string, stored: string): boolean | Promise<boolean>;
}
