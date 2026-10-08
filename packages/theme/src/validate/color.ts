export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** 0..1 */
  readonly a: number;
}

const NAMED: Readonly<Record<string, string>> = {
  black: '#000000', white: '#ffffff', transparent: '#00000000', red: '#ff0000', blue: '#0000ff', green: '#008000', gray: '#808080', grey: '#808080',
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

function parseChannel(token: string, scale: number): number {
  return token.endsWith('%') ? (Number.parseFloat(token) / 100) * scale : Number.parseFloat(token);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/**
 * Parse a literal CSS colour: hex (3/4/6/8), `rgb()/rgba()`, `hsl()/hsla()` (comma or space syntax), and a few
 * names. Anything that needs the browser to evaluate (`color-mix`, `oklch`, `var()`) returns `undefined`
 * so callers skip it instead of guessing.
 */
export function parseColor(input: string): Rgba | undefined {
  if (typeof input !== 'string') return undefined;
  const value = input.trim().toLowerCase();
  const named = NAMED[value];
  if (named !== undefined) return parseColor(named);

  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(value)?.[1];
  if (hex !== undefined) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    const n = (i: number): number => Number.parseInt(full.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: full.length === 8 ? n(6) / 255 : 1 };
  }

  const fn = /^(rgba?|hsla?)\(([^)]+)\)$/.exec(value);
  if (fn === null) return undefined;
  const parts = (fn[2] ?? '').split(/[\s,/]+/).filter((p) => p !== '');
  if (parts.length < 3) return undefined;
  const alpha = parts[3] === undefined ? 1 : clamp(parseChannel(parts[3], 1), 0, 1);
  if (fn[1]?.startsWith('rgb') === true) {
    const [r, g, b] = [parseChannel(parts[0] ?? '', 255), parseChannel(parts[1] ?? '', 255), parseChannel(parts[2] ?? '', 255)];
    return [r, g, b].some(Number.isNaN) ? undefined : { r: clamp(Math.round(r), 0, 255), g: clamp(Math.round(g), 0, 255), b: clamp(Math.round(b), 0, 255), a: alpha };
  }
  const h = Number.parseFloat(parts[0] ?? '');
  const s = parseChannel(parts[1] ?? '', 1);
  const l = parseChannel(parts[2] ?? '', 1);
  if ([h, s, l].some(Number.isNaN)) return undefined;
  const [r, g, b] = hslToRgb(((h % 360) + 360) % 360, clamp(s > 1 ? s / 100 : s, 0, 1), clamp(l > 1 ? l / 100 : l, 0, 1));
  return { r, g, b, a: alpha };
}

/** Composite `top` over an opaque `bottom`. */
export function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t: number, b: number): number => Math.round((t * top.a + b * bottom.a * (1 - top.a)) / a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
}

export function relativeLuminance({ r, g, b }: Rgba): number {
  const lin = (c: number): number => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * WCAG contrast ratio (1..21). Translucent colours are composited: the background over `backdrop`
 * (the page colour), then the text over that background.
 */
export function contrastRatio(foreground: Rgba, background: Rgba, backdrop: Rgba = { r: 255, g: 255, b: 255, a: 1 }): number {
  const bg = over(background, backdrop);
  const fg = over(foreground, bg);
  const [hi, lo] = [relativeLuminance(fg), relativeLuminance(bg)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export function toHex({ r, g, b }: Rgba): string {
  return `#${[r, g, b].map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The closest colour to `foreground` that reaches `target` contrast on `background`, found by blending toward
 * black or white (whichever helps). Returns `undefined` if even pure black/white cannot reach it. A suggestion only —
 * callers must apply it explicitly.
 */
export function suggestForeground(foreground: Rgba, background: Rgba, target: number, backdrop?: Rgba): Rgba | undefined {
  const bg = over(background, backdrop ?? { r: 255, g: 255, b: 255, a: 1 });
  const black: Rgba = { r: 0, g: 0, b: 0, a: 1 };
  const white: Rgba = { r: 255, g: 255, b: 255, a: 1 };
  const towardBlack = contrastRatio(black, bg) >= contrastRatio(white, bg);
  const anchor = towardBlack ? black : white;
  const base: Rgba = { ...foreground, a: 1 };
  for (let step = 0; step <= 100; step++) {
    const t = step / 100;
    const candidate: Rgba = {
      r: Math.round(base.r + (anchor.r - base.r) * t),
      g: Math.round(base.g + (anchor.g - base.g) * t),
      b: Math.round(base.b + (anchor.b - base.b) * t),
      a: 1,
    };
    if (contrastRatio(candidate, bg) >= target) return candidate;
  }
  return undefined;
}
