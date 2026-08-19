import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, CSSProperties } from 'react';
import { palette, radius, spacing, typography } from '@maw/theme';

/**
 * A minimal, token-styled web primitive set — enough for the sample app and to show the
 * pattern. A product's full design system (Sushmapet's `ui-kit/`: DataTable, form inputs,
 * charts) extracts into this package the same way, deduped across its apps.
 */

const base: CSSProperties = { fontFamily: typography.fontFamily, boxSizing: 'border-box' };

export function Button({
  variant = 'primary',
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }): ReactNode {
  const isPrimary = variant === 'primary';
  return (
    <button
      {...props}
      style={{
        ...base,
        padding: `${spacing.sm}px ${spacing.lg}px`,
        borderRadius: radius.md,
        border: isPrimary ? 'none' : `1px solid ${palette.border}`,
        background: isPrimary ? palette.brand : 'transparent',
        color: isPrimary ? palette.brandContrast : palette.fg,
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        cursor: props.disabled === true ? 'not-allowed' : 'pointer',
        opacity: props.disabled === true ? 0.6 : 1,
        ...style,
      }}
    />
  );
}

export function TextField({
  label,
  style,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }): ReactNode {
  return (
    <label style={{ ...base, display: 'block', marginBottom: spacing.md }}>
      {label !== undefined && (
        <span
          style={{
            display: 'block',
            marginBottom: spacing.xs,
            fontSize: typography.size.sm,
            color: palette.fgMuted,
          }}
        >
          {label}
        </span>
      )}
      <input
        {...props}
        style={{
          ...base,
          width: '100%',
          padding: `${spacing.sm}px ${spacing.md}px`,
          borderRadius: radius.md,
          border: `1px solid ${palette.border}`,
          fontSize: typography.size.md,
          color: palette.fg,
          background: palette.bg,
          ...style,
        }}
      />
    </label>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }): ReactNode {
  return (
    <div
      style={{
        ...base,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: radius.lg,
        padding: spacing.xl,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
