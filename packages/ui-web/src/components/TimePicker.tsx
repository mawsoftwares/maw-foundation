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
// TimePicker
// ---------------------------------------------------------------------------

export interface TimePickerProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly step?: number;
  readonly use24Hour?: boolean;
  readonly min?: string;
  readonly max?: string;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

function generateTimeOptions(step: number, use24Hour: boolean, min?: string, max?: string): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += step) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (min && val < min) continue;
    if (max && val > max) continue;

    let lbl: string;
    if (use24Hour) {
      lbl = val;
    } else {
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      lbl = `${h12}:${String(m).padStart(2, '0')} ${period}`;
    }
    opts.push({ value: val, label: lbl });
  }
  return opts;
}

export function TimePicker({
  label,
  value,
  onChange,
  error,
  disabled,
  required,
  step = 30,
  use24Hour = false,
  min,
  max,
  placeholder = 'Select time',
  style,
}: TimePickerProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => generateTimeOptions(step, use24Hour, min, max), [step, use24Hour, min, max]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && value && listRef.current) {
      const idx = options.findIndex((o) => o.value === value);
      if (idx >= 0) {
        const el = listRef.current.children[idx] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'center' });
      }
    }
  }, [open, value, options]);

  const selectedLabel = useMemo(() => {
    return options.find((o) => o.value === value)?.label ?? value;
  }, [value, options]);

  return (
    <div ref={containerRef} style={{ ...base, marginBottom: 'var(--maw-space-md)', position: 'relative', ...style }}>
      {label !== undefined && (
        <span style={labelStyle}>
          {label}
          {required && <span style={{ color: 'var(--maw-danger)', marginLeft: 2 }}>*</span>}
        </span>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: 'var(--maw-radius-md)',
          border: inputBorder(error !== undefined),
          background: disabled ? 'var(--maw-bgMuted)' : 'var(--maw-bg)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <input
          value={open ? search : (value ? selectedLabel : '')}
          onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { if (!disabled) { setOpen(true); setSearch(''); } }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); setSearch(''); }
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            ...base,
            flex: 1,
            padding: 'var(--maw-space-sm) var(--maw-space-md)',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 'var(--maw-text-md)',
            color: 'var(--maw-fg)',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
        {value && !disabled && (
          <span
            onClick={() => { onChange(''); setSearch(''); }}
            style={{ cursor: 'pointer', marginRight: 8, fontSize: 14, color: 'var(--maw-fgMuted)', lineHeight: 1 }}
          >
            ✕
          </span>
        )}
        <span style={{ marginRight: 8, fontSize: 16, color: 'var(--maw-fgMuted)' }}>🕐</span>
      </div>
      {open && !disabled && (
        <div
          ref={listRef}
          style={{
            ...base,
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 200,
            overflowY: 'auto',
            background: 'var(--maw-bg)',
            border: '1px solid var(--maw-border)',
            borderRadius: 'var(--maw-radius-md)',
            boxShadow: 'var(--maw-shadow-lg)',
            zIndex: 'var(--maw-z-dropdown)' as unknown as number,
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: 'var(--maw-space-md)', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)', textAlign: 'center' }}>
              No times
            </div>
          )}
          {filtered.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
              style={{
                ...base,
                padding: 'var(--maw-space-sm) var(--maw-space-md)',
                fontSize: 'var(--maw-text-sm)',
                color: 'var(--maw-fg)',
                background: opt.value === value ? 'var(--maw-bgMuted)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
      {error !== undefined && <span style={errorStyle}>{error}</span>}
    </div>
  );
}
