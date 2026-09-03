/**
 * Client-side SHA-256 prehash — the raw password never leaves the client.
 * Works in browsers (Web Crypto) and Node (node:crypto), and React Native
 * (expo-crypto or a polyfill for globalThis.crypto.subtle).
 *
 * The server receives the hex digest and feeds it to scrypt as the "password"
 * input. Defense-in-depth: even if TLS terminates at a load-balancer/WAF/proxy,
 * the raw password is never visible in request bodies or logs.
 */

const PREHASH_PREFIX = 'sha256:';

/** Returns `"sha256:<hex>"` so the server can identify and validate the format. */
export async function prehashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const digest = await cryptoDigest(encoded);
  return PREHASH_PREFIX + bufferToHex(digest);
}

/** True if the value was produced by `prehashPassword`. */
export function isPrehashedPassword(value: string): boolean {
  return value.startsWith(PREHASH_PREFIX) && /^[0-9a-f]{64}$/.test(value.slice(PREHASH_PREFIX.length));
}

/** Strip the prefix, returning the raw hex digest the server will feed to scrypt. */
export function extractPrehash(value: string): string {
  if (!isPrehashedPassword(value)) {
    throw new Error('Value is not a valid prehashed password');
  }
  return value.slice(PREHASH_PREFIX.length);
}

// -- Internals ----------------------------------------------------------------

async function cryptoDigest(data: Uint8Array): Promise<ArrayBuffer> {
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    return globalThis.crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  }

  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256').update(data);
  const buf = hash.digest();
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
