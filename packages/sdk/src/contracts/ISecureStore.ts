/**
 * Secure key/value storage port for auth tokens.
 *
 * The single seam that differs by platform: `expo-secure-store` on React Native,
 * `localStorage` (or an httpOnly cookie) on web. Auth/session logic depends only on
 * this interface, so the same code persists tokens on every platform.
 */
export interface ISecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
