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
// Progress
// ---------------------------------------------------------------------------

export function Progress({
  value,
  max = 100,
  height = 8,
  style,
}: {
  value: number;
  max?: number;
  height?: number;
  style?: CSSProperties;
}): ReactNode {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: height / 2,
        background: 'var(--maw-bgMuted)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: height / 2,
          background: 'var(--maw-brand)',
          transition: 'var(--maw-transition-normal)',
        }}
      />
    </div>
  );
}
