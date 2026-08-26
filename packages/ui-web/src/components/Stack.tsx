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
// Stack
// ---------------------------------------------------------------------------

export function Stack({
  direction = 'column',
  gap = 'var(--maw-space-md)',
  align,
  justify,
  children,
  style,
}: {
  direction?: 'row' | 'column';
  gap?: string | number;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  children: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: direction, gap, alignItems: align, justifyContent: justify, ...style }}>
      {children}
    </div>
  );
}
