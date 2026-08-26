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
// IconButton
// ---------------------------------------------------------------------------

export function IconButton({
  label,
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }): ReactNode {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      style={{
        ...base,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        padding: 0,
        border: 'none',
        borderRadius: 'var(--maw-radius-md)',
        background: 'transparent',
        color: 'var(--maw-fgMuted)',
        cursor: 'pointer',
        transition: 'var(--maw-transition-fast)',
        ...style,
      }}
    />
  );
}
