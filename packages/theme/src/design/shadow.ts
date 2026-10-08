import type { ShadowLayer } from './types';

/** Split on `sep`, ignoring separators inside parentheses (`rgba(0, 0, 0, .2)`, `color-mix(...)`). */
function splitTopLevel(text: string, sep: ',' | ' '): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    const isSep = depth === 0 && (sep === ' ' ? /\s/.test(ch) : ch === sep);
    if (isSep) {
      if (current.trim() !== '') parts.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim() !== '') parts.push(current.trim());
  return parts;
}

const LENGTH = /^-?(?:\d+\.?\d*|\.\d+)(?:px)?$/;

/**
 * Parse a CSS `box-shadow` value into layers. Returns `undefined` when it uses something we cannot represent
 * exactly (non-px units, `var()` lengths), so the caller can keep the CSS verbatim instead of guessing.
 */
export function parseShadowCss(css: string): readonly ShadowLayer[] | undefined {
  const trimmed = css.trim();
  if (trimmed === 'none') return [];
  const layers: ShadowLayer[] = [];
  for (const raw of splitTopLevel(trimmed, ',')) {
    let inset = false;
    const lengths: number[] = [];
    let color: string | undefined;
    for (const token of splitTopLevel(raw, ' ')) {
      if (token.toLowerCase() === 'inset') inset = true;
      else if (LENGTH.test(token)) lengths.push(Number.parseFloat(token));
      else if (/^-?[\d.]+[a-z%]+$/i.test(token) || token.startsWith('var(')) return undefined;
      else if (color === undefined) color = token;
      else return undefined;
    }
    if (lengths.length < 2 || lengths.length > 4) return undefined;
    const [offsetX, offsetY, blur = 0, spread = 0] = lengths as [number, number, number?, number?];
    layers.push({ offsetX, offsetY, blur, spread, color: color ?? 'currentcolor', ...(inset ? { inset } : {}) });
  }
  return layers.length > 0 ? layers : undefined;
}
