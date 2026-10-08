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
// TextArea
// ---------------------------------------------------------------------------

export function TextArea({
  label,
  error,
  style,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }): ReactNode {
  return (
    <label style={{ ...base, display: 'block', marginBottom: 'var(--maw-space-md)' }}>
      {label !== undefined && (
        <span style={{ display: 'block', marginBottom: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
          {label}
        </span>
      )}
      <textarea
        {...props}
        className={`maw-focus-ring maw-input ${props.className || ''}`.trim()}
        style={{
          ...base,
          width: '100%',
          padding: 'var(--maw-comp-inputs-padding, var(--maw-space-sm) var(--maw-space-md))',
          height: 'var(--maw-comp-inputs-height, auto)',
          borderRadius: 'var(--maw-comp-inputs-border-radius, var(--maw-radius-md))',
          border: `1px solid ${error ? 'var(--maw-danger)' : 'var(--maw-comp-inputs-border-color, var(--maw-border))'}`,
          fontSize: 'var(--maw-comp-inputs-font-size, var(--maw-text-md))',
          color: 'var(--maw-comp-inputs-text-color, var(--maw-fg))',
          background: 'var(--maw-comp-inputs-background, var(--maw-bg))',
          resize: 'vertical',
          minHeight: 80,
          outline: 'none',
          ...style,
        }}
      />
      {error !== undefined && (
        <span style={{ display: 'block', marginTop: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-danger)' }}>
          {error}
        </span>
      )}
    </label>
  );
}
