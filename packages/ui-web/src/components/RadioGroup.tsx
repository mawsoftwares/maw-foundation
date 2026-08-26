import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 'var(--maw-space-xs)',
  fontSize: 'var(--maw-text-sm)',
  color: 'var(--maw-fgMuted)',
};

const errorStyle: CSSProperties = {
  display: 'block',
  marginTop: 'var(--maw-space-xs)',
  fontSize: 'var(--maw-text-xs)',
  color: 'var(--maw-danger)',
};

const inputBorder = (hasError: boolean) =>
  `1px solid ${hasError ? 'var(--maw-danger)' : 'var(--maw-border)'}`;

// ---------------------------------------------------------------------------
// RadioGroup
// ---------------------------------------------------------------------------

export interface RadioOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface RadioGroupProps {
  readonly label?: string;
  readonly name: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly RadioOption[];
  readonly error?: string;
  readonly disabled?: boolean;
  readonly direction?: 'row' | 'column';
  readonly required?: boolean;
  readonly style?: CSSProperties;
}

export function RadioGroup({
  label,
  name,
  value,
  onChange,
  options,
  error,
  disabled,
  direction = 'column',
  required,
  style,
}: RadioGroupProps): ReactNode {
  return (
    <fieldset
      style={{
        ...base,
        border: 'none',
        padding: 0,
        margin: 0,
        marginBottom: 'var(--maw-space-md)',
        ...style,
      }}
    >
      {label !== undefined && (
        <legend style={{ ...labelStyle, marginBottom: 'var(--maw-space-sm)' }}>
          {label}
          {required && <span style={{ color: 'var(--maw-danger)', marginLeft: 2 }}>*</span>}
        </legend>
      )}
      <div
        role="radiogroup"
        style={{
          display: 'flex',
          flexDirection: direction,
          gap: direction === 'row' ? 'var(--maw-space-lg)' : 'var(--maw-space-sm)',
        }}
      >
        {options.map((opt) => {
          const isDisabled = disabled || opt.disabled;
          return (
            <label
              key={opt.value}
              style={{
                ...base,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--maw-space-sm)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.6 : 1,
                fontSize: 'var(--maw-text-md)',
                color: 'var(--maw-fg)',
              }}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                disabled={isDisabled}
                style={{ accentColor: 'var(--maw-brand)', width: 18, height: 18, margin: 0 }}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
      {error !== undefined && <span style={errorStyle}>{error}</span>}
    </fieldset>
  );
}
