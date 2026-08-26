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
// Spinner
// ---------------------------------------------------------------------------

export function Spinner({ size = 24, style }: { size?: number; style?: CSSProperties }): ReactNode {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `3px solid var(--maw-border)`,
        borderTopColor: 'var(--maw-brand)',
        borderRadius: '50%',
        animation: 'maw-spin 0.6s linear infinite',
        ...style,
      }}
    />
  );
}
