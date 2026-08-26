import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

export function Avatar({
  src,
  name,
  size = 40,
  style,
}: {
  src?: string;
  name?: string;
  size?: number;
  style?: CSSProperties;
}): ReactNode {
  const initials = typeof name === 'string' && name.trim().length > 0
    ? name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  return src ? (
    <img
      src={src}
      alt={name ?? ''}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        ...style,
      }}
    />
  ) : (
    <div
      style={{
        ...base,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--maw-brand)',
        color: 'var(--maw-brandContrast)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        ...style,
      }}
    >
      {initials}
    </div>
  );
}
