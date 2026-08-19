/**
 * Local identifier generation.
 *
 * IDs are opaque strings so locally-created and server-created records are
 * interchangeable — the backend accepts client-generated IDs for idempotent upserts,
 * so nothing has to be renumbered when the network arrives.
 */
import type { ID } from './ids';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Monotonic within a millisecond, so IDs minted in a tight loop stay unique. */
let counter = 0;

function randomSuffix(length: number): string {
  let out = '';
  for (let index = 0; index < length; index += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * Generate a collision-resistant, sortable-by-creation ID. Time-prefixed so records
 * stay roughly ordered in storage. Deliberately not `crypto.randomUUID()` — it is
 * absent on some React Native (Hermes) builds.
 */
export function newId(prefix?: string): ID {
  counter = (counter + 1) % 1_000_000;
  const time = Date.now().toString(36);
  const seq = counter.toString(36).padStart(4, '0');
  const body = `${time}${seq}${randomSuffix(6)}`;
  return prefix === undefined ? body : `${prefix}_${body}`;
}
