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
// Checkbox
// ---------------------------------------------------------------------------

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  style,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  style?: CSSProperties;
}): ReactNode {
  return (
    <label
      style={{
        ...base,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--maw-space-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 'var(--maw-state-disabled-opacity, 0.6)' as unknown as number : 1,
        fontSize: 'var(--maw-text-md)',
        color: 'var(--maw-fg)',
        ...style,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="maw-focusable"
        style={{ accentColor: 'var(--maw-comp-checkboxes-accent-color, var(--maw-brand))', width: 'var(--maw-comp-checkboxes-size, 18px)', height: 'var(--maw-comp-checkboxes-size, 18px)' }}
      />
      {label}
    </label>
  );
}
