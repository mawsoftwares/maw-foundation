const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const quote = (s: string): string =>
  `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;

/**
 * A deterministic TypeScript literal for plain data: sorted keys, single quotes, 2-space indent, no `undefined`.
 * Stable output keeps regenerated client themes diff-friendly in version control.
 */
export function toTsLiteral(value: unknown, depth = 0): string {
  const pad = '  '.repeat(depth);
  const inner = '  '.repeat(depth + 1);
  if (value === null) return 'null';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[\n${value.map((v) => `${inner}${toTsLiteral(v, depth + 1)}`).join(',\n')},\n${pad}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) return '{}';
    return `{\n${entries.map(([k, v]) => `${inner}${IDENTIFIER.test(k) ? k : quote(k)}: ${toTsLiteral(v, depth + 1)}`).join(',\n')},\n${pad}}`;
  }
  return 'undefined';
}

/** JSON with sorted keys, so the same theme always serializes the same way. */
export function stableJson(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (typeof v === 'object' && v !== null) {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sort(x)]));
    }
    return v;
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}
