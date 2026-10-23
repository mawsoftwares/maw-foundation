// Dates cross the UI contract as ISO calendar strings (YYYY-MM-DD). Parse/format them as LOCAL dates so a
// picked day never shifts with the timezone (new Date('2025-01-05') would be midnight UTC).

export function parseISO(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
}

export function toISO(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function formatDate(value: string, locale?: string): string {
  const date = parseISO(value);
  return date === undefined ? value : date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}
