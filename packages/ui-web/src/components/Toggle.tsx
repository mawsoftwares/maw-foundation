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
// Toggle
// ---------------------------------------------------------------------------

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  style,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: CSSProperties;
}): ReactNode {
  return (
    <label
      style={{
        ...base,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--maw-space-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      <div
        onClick={(e) => { if (!disabled) { e.preventDefault(); onChange(!checked); } }}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: checked ? 'var(--maw-brand)' : 'var(--maw-border)',
          position: 'relative',
          transition: 'var(--maw-transition-fast)',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 2,
            left: checked ? 22 : 2,
            transition: 'var(--maw-transition-fast)',
            boxShadow: 'var(--maw-shadow-sm)',
          }}
        />
      </div>
      {label !== undefined && <span style={{ fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)' }}>{label}</span>}
    </label>
  );
}
