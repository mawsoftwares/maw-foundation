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
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
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
        style={{
          ...base,
          width: '100%',
          padding: 'var(--maw-space-sm) var(--maw-space-md)',
          borderRadius: 'var(--maw-radius-md)',
          border: `1px solid ${error ? 'var(--maw-danger)' : 'var(--maw-border)'}`,
          fontSize: 'var(--maw-text-md)',
          color: 'var(--maw-fg)',
          background: 'var(--maw-bg)',
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

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

export function Select({
  label,
  error,
  options,
  placeholder,
  style,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}): ReactNode {
  return (
    <label style={{ ...base, display: 'block', marginBottom: 'var(--maw-space-md)' }}>
      {label !== undefined && (
        <span style={{ display: 'block', marginBottom: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
          {label}
        </span>
      )}
      <select
        {...props}
        style={{
          ...base,
          width: '100%',
          padding: 'var(--maw-space-sm) var(--maw-space-md)',
          borderRadius: 'var(--maw-radius-md)',
          border: `1px solid ${error ? 'var(--maw-danger)' : 'var(--maw-border)'}`,
          fontSize: 'var(--maw-text-md)',
          color: 'var(--maw-fg)',
          background: 'var(--maw-bg)',
          outline: 'none',
          ...style,
        }}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error !== undefined && (
        <span style={{ display: 'block', marginTop: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-danger)' }}>
          {error}
        </span>
      )}
    </label>
  );
}

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
        opacity: disabled ? 0.6 : 1,
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
        style={{ accentColor: 'var(--maw-brand)', width: 18, height: 18 }}
      />
      {label}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Toggle / Switch
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

// ---------------------------------------------------------------------------
// Modal / Dialog
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}): ReactNode {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--maw-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--maw-z-modal)' as unknown as number,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...base,
          background: 'var(--maw-bg)',
          borderRadius: 'var(--maw-radius-lg)',
          boxShadow: 'var(--maw-shadow-xl)',
          width,
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {title !== undefined && (
          <div style={{ padding: 'var(--maw-space-lg) var(--maw-space-xl)', borderBottom: '1px solid var(--maw-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--maw-text-lg)', fontWeight: 600, color: 'var(--maw-fg)' }}>{title}</h2>
            <IconButton label="Close" onClick={onClose}>✕</IconButton>
          </div>
        )}
        <div style={{ padding: 'var(--maw-space-xl)', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer !== undefined && (
          <div style={{ padding: 'var(--maw-space-lg) var(--maw-space-xl)', borderTop: '1px solid var(--maw-border)', display: 'flex', gap: 'var(--maw-space-sm)', justifyContent: 'flex-end' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export function Tabs({
  tabs,
  activeTab,
  onChange,
  style,
}: {
  tabs: readonly { key: string; label: string }[];
  activeTab: string;
  onChange: (key: string) => void;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div style={{ ...base, display: 'flex', borderBottom: '1px solid var(--maw-border)', ...style }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            ...base,
            padding: 'var(--maw-space-sm) var(--maw-space-lg)',
            border: 'none',
            background: 'none',
            color: activeTab === tab.key ? 'var(--maw-brand)' : 'var(--maw-fgMuted)',
            fontWeight: activeTab === tab.key ? 600 : 400,
            fontSize: 'var(--maw-text-sm)',
            cursor: 'pointer',
            borderBottom: activeTab === tab.key ? '2px solid var(--maw-brand)' : '2px solid transparent',
            marginBottom: -1,
            transition: 'var(--maw-transition-fast)',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}): ReactNode {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      {show && (
        <div
          style={{
            ...base,
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 4,
            padding: '4px 8px',
            borderRadius: 'var(--maw-radius-sm)',
            background: 'var(--maw-fg)',
            color: 'var(--maw-bg)',
            fontSize: 'var(--maw-text-xs)',
            whiteSpace: 'nowrap',
            zIndex: 'var(--maw-z-tooltip)' as unknown as number,
            pointerEvents: 'none',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

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

// ---------------------------------------------------------------------------
// Stack layout helpers
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

// ---------------------------------------------------------------------------
// Dropdown / Popover menu
// ---------------------------------------------------------------------------

export function DropdownMenu({
  trigger,
  items,
}: {
  trigger: ReactNode;
  items: readonly { key: string; label: string; danger?: boolean; onClick: () => void }[];
}): ReactNode {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          style={{
            ...base,
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 160,
            background: 'var(--maw-bg)',
            border: '1px solid var(--maw-border)',
            borderRadius: 'var(--maw-radius-md)',
            boxShadow: 'var(--maw-shadow-lg)',
            zIndex: 'var(--maw-z-dropdown)' as unknown as number,
            overflow: 'hidden',
          }}
        >
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => { item.onClick(); setOpen(false); }}
              style={{
                ...base,
                display: 'block',
                width: '100%',
                padding: 'var(--maw-space-sm) var(--maw-space-md)',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                fontSize: 'var(--maw-text-sm)',
                color: item.danger ? 'var(--maw-danger)' : 'var(--maw-fg)',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSS keyframes injection (one-time)
// ---------------------------------------------------------------------------

const KEYFRAMES_ID = 'maw-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(KEYFRAMES_ID)) {
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `@keyframes maw-spin { to { transform: rotate(360deg); } }
@keyframes maw-skeleton { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`;
  document.head.appendChild(style);
}
