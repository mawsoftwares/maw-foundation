/**
 * Isomorphic date/time utilities — no external dependencies.
 * All functions accept and return standard Date objects or ISO strings.
 */

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function parseISO(iso: string): Date {
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new Error(`Invalid ISO date: "${iso}"`);
  return d;
}

export function toISO(date: Date): string {
  return date.toISOString();
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export type DateFormatStyle = 'short' | 'medium' | 'long';

const DATE_FORMATS: Record<DateFormatStyle, Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: '2-digit', year: 'numeric' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' },
};

const TIME_FORMATS: Record<DateFormatStyle, Intl.DateTimeFormatOptions> = {
  short: { hour: '2-digit', minute: '2-digit' },
  medium: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
  long: { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' },
};

export function formatDate(
  date: Date | string,
  style: DateFormatStyle = 'medium',
  locale = 'en-IN',
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return new Intl.DateTimeFormat(locale, DATE_FORMATS[style]).format(d);
}

export function formatTime(
  date: Date | string,
  style: DateFormatStyle = 'short',
  locale = 'en-IN',
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return new Intl.DateTimeFormat(locale, TIME_FORMATS[style]).format(d);
}

export function formatDateTime(
  date: Date | string,
  style: DateFormatStyle = 'medium',
  locale = 'en-IN',
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return new Intl.DateTimeFormat(locale, {
    ...DATE_FORMATS[style],
    ...TIME_FORMATS[style === 'long' ? 'medium' : style],
  }).format(d);
}

// ---------------------------------------------------------------------------
// Relative time ("2 hours ago", "in 3 days")
// ---------------------------------------------------------------------------

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

export function relativeTime(
  date: Date | string,
  baseDate: Date = new Date(),
  locale = 'en',
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const diffSeconds = Math.round((d.getTime() - baseDate.getTime()) / 1000);

  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit || unit === 'second') {
      const value = Math.round(diffSeconds / secondsInUnit);
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit);
    }
  }

  return 'now';
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function diffDays(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / msPerDay);
}

export function diffHours(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (60 * 60 * 1000));
}

export function diffMinutes(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (60 * 1000));
}

// ---------------------------------------------------------------------------
// Boundaries
// ---------------------------------------------------------------------------

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

// ---------------------------------------------------------------------------
// Comparisons
// ---------------------------------------------------------------------------

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}
