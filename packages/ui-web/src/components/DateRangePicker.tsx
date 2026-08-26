import { parseDateISO, CalendarPanel } from './DatePicker';
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
// DateRangePicker
// ---------------------------------------------------------------------------

export interface DateRange {
  readonly start: string;
  readonly end: string;
}

export interface DateRangePickerProps {
  readonly label?: string;
  readonly value: DateRange;
  readonly onChange: (value: DateRange) => void;
  readonly min?: string;
  readonly max?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

export function DateRangePicker({
  label,
  value,
  onChange,
  min,
  max,
  error,
  disabled,
  required,
  placeholder = 'Select range',
  style,
}: DateRangePickerProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedStart = parseDateISO(value.start);
  const now = new Date();
  const [viewYear, setViewYear] = useState(parsedStart?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedStart?.month ?? now.getMonth());

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = useCallback(
    (date: string) => {
      if (selecting === 'start') {
        onChange({ start: date, end: value.end && date <= value.end ? value.end : '' });
        setSelecting('end');
      } else {
        if (date >= value.start) {
          onChange({ start: value.start, end: date });
          setOpen(false);
          setSelecting('start');
        } else {
          onChange({ start: date, end: '' });
          setSelecting('end');
        }
      }
    },
    [selecting, value, onChange],
  );

  const formatDisplay = (iso: string) => {
    const p = parseDateISO(iso);
    if (!p) return iso;
    try {
      return new Date(p.year, p.month, p.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const displayValue = value.start && value.end
    ? `${formatDisplay(value.start)} – ${formatDisplay(value.end)}`
    : value.start
      ? `${formatDisplay(value.start)} – ...`
      : '';

  return (
    <div ref={containerRef} style={{ ...base, marginBottom: 'var(--maw-space-md)', position: 'relative', ...style }}>
      {label !== undefined && (
        <span style={labelStyle}>
          {label}
          {required && <span style={{ color: 'var(--maw-danger)', marginLeft: 2 }}>*</span>}
        </span>
      )}
      <div
        onClick={() => { if (!disabled) { setOpen(!open); setSelecting('start'); } }}
        style={{
          ...base,
          display: 'flex',
          alignItems: 'center',
          padding: 'var(--maw-space-sm) var(--maw-space-md)',
          borderRadius: 'var(--maw-radius-md)',
          border: inputBorder(error !== undefined),
          background: disabled ? 'var(--maw-bgMuted)' : 'var(--maw-bg)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          fontSize: 'var(--maw-text-md)',
          color: displayValue ? 'var(--maw-fg)' : 'var(--maw-fgMuted)',
          minHeight: 40,
        }}
      >
        <span style={{ flex: 1 }}>{displayValue || placeholder}</span>
        {(value.start || value.end) && !disabled && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange({ start: '', end: '' }); }}
            style={{ cursor: 'pointer', fontSize: 14, color: 'var(--maw-fgMuted)', marginLeft: 4, lineHeight: 1 }}
          >
            ✕
          </span>
        )}
        <span style={{ marginLeft: 8, fontSize: 16, color: 'var(--maw-fgMuted)' }}>📅</span>
      </div>
      {open && !disabled && (
        <div
          style={{
            ...base,
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: 'var(--maw-bg)',
            border: '1px solid var(--maw-border)',
            borderRadius: 'var(--maw-radius-md)',
            boxShadow: 'var(--maw-shadow-lg)',
            zIndex: 'var(--maw-z-dropdown)' as unknown as number,
          }}
        >
          <div style={{ padding: 'var(--maw-space-sm) var(--maw-space-md)', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', textAlign: 'center' }}>
            {selecting === 'start' ? 'Select start date' : 'Select end date'}
          </div>
          <CalendarPanel
            selectedDate={selecting === 'start' ? value.start : value.end}
            onSelect={handleSelect}
            viewYear={viewYear}
            viewMonth={viewMonth}
            onNavigate={(y, m) => { setViewYear(y); setViewMonth(m); }}
            min={selecting === 'end' ? value.start || min : min}
            max={max}
          />
        </div>
      )}
      {error !== undefined && <span style={errorStyle}>{error}</span>}
    </div>
  );
}
