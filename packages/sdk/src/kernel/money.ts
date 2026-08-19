/**
 * Money primitives.
 *
 * INVARIANT: money is ALWAYS an integer number of minor units (paise/cents). `1050`
 * means ₹10.50. Floating point never touches a currency value; formatting happens only
 * here, at the edge. Every function is pure and deterministic (receipt rendering depends
 * on it), so digit grouping is implemented by hand rather than via `Intl`.
 */

/** An amount in integer minor units. */
export type Money = number;

export const DEFAULT_CURRENCY_SYMBOL = '₹';

const MINOR_UNITS_PER_MAJOR = 100;

/** Round half away from zero (symmetric for negatives, unlike `Math.round`). */
export function roundHalfUp(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Convert a major-unit amount (49.90) to minor units (4990). */
export function toMinor(major: number): Money {
  return roundHalfUp(major * MINOR_UNITS_PER_MAJOR);
}

/** Convert minor units to a major-unit number. Display only — never for math. */
export function toMajor(minor: Money): number {
  return minor / MINOR_UNITS_PER_MAJOR;
}

/** Group digits in the Indian convention: last three, then pairs. 1234567 -> "12,34,567". */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  const groupedHead = head.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${groupedHead},${tail}`;
}

/** Group digits in the Western convention: threes. 1234567 -> "1,234,567". */
function groupWestern(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export type Grouping = 'indian' | 'western';

/** Format minor units for display: `formatMoney(4990)` -> `"₹49.90"`. */
export function formatMoney(
  minor: Money,
  symbol: string = DEFAULT_CURRENCY_SYMBOL,
  grouping: Grouping = 'indian',
): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const major = Math.floor(abs / MINOR_UNITS_PER_MAJOR);
  const fraction = String(abs % MINOR_UNITS_PER_MAJOR).padStart(2, '0');
  const group = grouping === 'western' ? groupWestern : groupIndian;
  return `${sign}${symbol}${group(String(major))}.${fraction}`;
}

/** Format without a currency symbol (for thermal printers lacking the glyph). */
export function formatMoneyPlain(minor: Money): string {
  return formatMoney(minor, '');
}

/** Multiply an amount by an integer quantity. Exact. */
export function multiplyMoney(minor: Money, quantity: number): Money {
  return minor * quantity;
}

/** Sum a list of amounts. Exact. */
export function sumMoney(values: readonly Money[]): Money {
  return values.reduce<Money>((total, value) => total + value, 0);
}

/** A percentage of an amount, rounded half-up to the nearest minor unit. */
export function percentOf(minor: Money, percent: number): Money {
  return roundHalfUp((minor * percent) / 100);
}

/**
 * Split an amount into `parts` pieces that sum EXACTLY back to the original. Each part
 * gets `floor(total / parts)`; the remainder minor units go one each to the leading
 * parts. `splitMoney(1667, 2)` -> `[834, 833]`.
 */
export function splitMoney(total: Money, parts: number): Money[] {
  if (parts <= 0) {
    throw new RangeError(`splitMoney requires at least one part, received ${parts}`);
  }
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const base = Math.floor(abs / parts);
  const remainder = abs - base * parts;
  return Array.from({ length: parts }, (_, index) => sign * (base + (index < remainder ? 1 : 0)));
}

/**
 * Parse user-typed text ("220", "220.5", "₹1,234.50") into minor units. Returns `null`
 * when the text is not a valid non-negative amount, so callers handle failure explicitly.
 */
export function parseMoneyInput(text: string): Money | null {
  const cleaned = text.replace(/[\s,₹$]/g, '');
  if (cleaned === '') return null;

  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (match === null) return null;

  const [, whole = '', fraction = ''] = match;
  if (whole === '' && fraction === '') return null;

  const rupees = whole === '' ? 0 : Number(whole);
  const paise = Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(rupees) || !Number.isFinite(paise)) return null;

  return rupees * MINOR_UNITS_PER_MAJOR + paise;
}
