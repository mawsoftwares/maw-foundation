/**
 * File/path utilities — isomorphic where possible, Node-specific helpers
 * guarded behind runtime checks.
 */

// ---------------------------------------------------------------------------
// Extension & path helpers (pure string operations — fully isomorphic)
// ---------------------------------------------------------------------------

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return '';
  return filename.slice(dot + 1).toLowerCase();
}

export function removeExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return filename;
  return filename.slice(0, dot);
}

export function getFilename(path: string): string {
  const sep = path.lastIndexOf('/');
  const backslash = path.lastIndexOf('\\');
  const last = Math.max(sep, backslash);
  return last === -1 ? path : path.slice(last + 1);
}

export function getDirectory(path: string): string {
  const sep = path.lastIndexOf('/');
  const backslash = path.lastIndexOf('\\');
  const last = Math.max(sep, backslash);
  return last === -1 ? '.' : path.slice(0, last);
}

export function joinPath(...segments: string[]): string {
  return segments
    .map((s, i) => (i === 0 ? s.replace(/\/+$/, '') : s.replace(/^\/+|\/+$/g, '')))
    .filter(Boolean)
    .join('/');
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

// ---------------------------------------------------------------------------
// MIME / content-type
// ---------------------------------------------------------------------------

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  pdf: 'application/pdf',
  json: 'application/json',
  xml: 'application/xml',
  csv: 'text/csv',
  txt: 'text/plain',
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  ts: 'application/typescript',
  zip: 'application/zip',
  gz: 'application/gzip',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function getMimeType(filename: string): string {
  const ext = getExtension(filename);
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

export function isImageFile(filename: string): boolean {
  return getMimeType(filename).startsWith('image/');
}

export function isVideoFile(filename: string): boolean {
  return getMimeType(filename).startsWith('video/');
}

export function isAudioFile(filename: string): boolean {
  return getMimeType(filename).startsWith('audio/');
}

// ---------------------------------------------------------------------------
// File size formatting
// ---------------------------------------------------------------------------

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatFileSize(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unit = SIZE_UNITS[i] ?? SIZE_UNITS[SIZE_UNITS.length - 1]!;
  return `${(bytes / k ** i).toFixed(decimals)} ${unit}`;
}

export function parseFileSize(str: string): number {
  const match = /^([\d.]+)\s*(B|KB|MB|GB|TB)$/i.exec(str.trim());
  if (!match) throw new Error(`Invalid file size: "${str}"`);
  const value = parseFloat(match[1]!);
  const unit = match[2]!.toUpperCase();
  const index = SIZE_UNITS.indexOf(unit as (typeof SIZE_UNITS)[number]);
  return Math.round(value * 1024 ** index);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function isAllowedExtension(filename: string, allowed: string[]): boolean {
  const ext = getExtension(filename);
  return allowed.some((a) => a.toLowerCase() === ext);
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/^\.+/, '_')
    .slice(0, 255);
}
