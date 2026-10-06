export type FileKind = 'image' | 'pdf' | 'video' | 'audio' | 'sheet' | 'doc' | 'archive' | 'text' | 'other';

export function kindOf(mimeType: string, name = ''): FileKind {
  const m = mimeType.toLowerCase();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m.includes('spreadsheet') || m.includes('excel') || m === 'text/csv' || ['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet';
  if (m.includes('word') || m.includes('presentation') || m.includes('powerpoint') || ['doc', 'docx', 'ppt', 'pptx'].includes(ext)) return 'doc';
  if (m.includes('zip') || m.includes('compressed') || ['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)) return 'archive';
  if (m.startsWith('text/') || ['txt', 'md', 'json', 'log'].includes(ext)) return 'text';
  return 'other';
}

const ICONS: Record<FileKind, string> = {
  image: '🖼️', pdf: '📕', video: '🎞️', audio: '🎵', sheet: '📊', doc: '📝', archive: '🗜️', text: '📄', other: '📎',
};

export function iconOf(kind: FileKind): string {
  return ICONS[kind];
}

/** Kinds the browser can show inline from a signed URL. */
export function isPreviewable(kind: FileKind): boolean {
  return kind === 'image' || kind === 'pdf' || kind === 'video' || kind === 'audio';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
