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
// DatePicker
// ---------------------------------------------------------------------------

export interface DatePickerProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly min?: string;
  readonly max?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly locale?: string;
  readonly style?: CSSProperties;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseDateISO(dateStr: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  return { year: parseInt(match[1]!, 10), month: parseInt(match[2]!, 10) - 1, day: parseInt(match[3]!, 10) };
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CalendarPanel({
  selectedDate,
  onSelect,
  viewYear,
  viewMonth,
  onNavigate,
  min,
  max,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  viewYear: number;
  viewMonth: number;
  onNavigate: (year: number, month: number) => void;
  min?: string;
  max?: string;
}): ReactNode {
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) onNavigate(viewYear - 1, 11);
    else onNavigate(viewYear, viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) onNavigate(viewYear + 1, 0);
    else onNavigate(viewYear, viewMonth + 1);
  };

  const isDisabled = (day: number): boolean => {
    const iso = formatDateISO(viewYear, viewMonth, day);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const todayISO = formatDateISO(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const cellSize = 36;

  return (
    <div style={{ ...base, padding: 'var(--maw-space-md)', width: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--maw-space-md)' }}>
        <button onClick={prevMonth} type="button" style={{ ...base, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--maw-fgMuted)', fontSize: 18, padding: 4 }}>
          ‹
        </button>
        <span style={{ fontWeight: 600, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} type="button" style={{ ...base, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--maw-fgMuted)', fontSize: 18, padding: 4 }}>
          ›
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${cellSize}px)`, gap: 2 }}>
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            style={{
              width: cellSize,
              height: cellSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--maw-text-xs)',
              color: 'var(--maw-fgMuted)',
              fontWeight: 600,
            }}
          >
            {wd}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} style={{ width: cellSize, height: cellSize }} />;
          const iso = formatDateISO(viewYear, viewMonth, day);
          const selected = iso === selectedDate;
          const today = iso === todayISO;
          const dayDisabled = isDisabled(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => { if (!dayDisabled) onSelect(iso); }}
              disabled={dayDisabled}
              style={{
                ...base,
                width: cellSize,
                height: cellSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: today && !selected ? '1px solid var(--maw-brand)' : 'none',
                borderRadius: 'var(--maw-radius-sm)',
                background: selected ? 'var(--maw-brand)' : 'transparent',
                color: selected ? 'var(--maw-brandContrast)' : dayDisabled ? 'var(--maw-fgMuted)' : 'var(--maw-fg)',
                fontSize: 'var(--maw-text-sm)',
                cursor: dayDisabled ? 'not-allowed' : 'pointer',
                opacity: dayDisabled ? 0.4 : 1,
                padding: 0,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  error,
  disabled,
  required,
  placeholder = 'Select date',
  style,
}: DatePickerProps): ReactNode {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = parseDateISO(value);
  const now = new Date();
  const [viewYear, setViewYear] = useState(parsed?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? now.getMonth());

  useEffect(() => {
    const p = parseDateISO(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayValue = useMemo(() => {
    if (!value) return '';
    const p = parseDateISO(value);
    if (!p) return value;
    try {
      return new Date(p.year, p.month, p.day).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return value;
    }
  }, [value]);

  return (
    <div ref={containerRef} style={{ ...base, marginBottom: 'var(--maw-space-md)', position: 'relative', ...style }}>
      {label !== undefined && (
        <span style={labelStyle}>
          {label}
          {required && <span style={{ color: 'var(--maw-danger)', marginLeft: 2 }}>*</span>}
        </span>
      )}
      <div
        onClick={() => { if (!disabled) setOpen(!open); }}
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
          color: value ? 'var(--maw-fg)' : 'var(--maw-fgMuted)',
          minHeight: 40,
        }}
      >
        <span style={{ flex: 1 }}>{displayValue || placeholder}</span>
        {value && !disabled && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
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
          <CalendarPanel
            selectedDate={value}
            onSelect={(d) => { onChange(d); setOpen(false); }}
            viewYear={viewYear}
            viewMonth={viewMonth}
            onNavigate={(y, m) => { setViewYear(y); setViewMonth(m); }}
            min={min}
            max={max}
          />
        </div>
      )}
      {error !== undefined && <span style={errorStyle}>{error}</span>}
    </div>
  );
}
