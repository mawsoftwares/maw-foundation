const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

export function sanitizeCellValue(value: string): string {
  if (value.length === 0) return value;
  if (FORMULA_TRIGGERS.some((ch) => value.startsWith(ch))) {
    return `\t${value}`;
  }
  return value;
}

export function sanitizeFilePath(path: string): string {
  return path
    .replace(/\.\./g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"|?*\x00-\x1f]/g, '_')
    .replace(/^[/\\]+/, '');
}

export function sanitizeRowValue(value: unknown, maxLength = 100): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}
