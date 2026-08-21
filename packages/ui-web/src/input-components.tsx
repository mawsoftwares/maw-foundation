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
// RadioGroup + RadioOption
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

// ---------------------------------------------------------------------------
// MultiSelect
// ---------------------------------------------------------------------------

export interface MultiSelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface MultiSelectProps {
  readonly label?: string;
  readonly value: readonly string[];
  readonly onChange: (value: readonly string[]) => void;
  readonly options: readonly MultiSelectOption[];
  readonly placeholder?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly searchable?: boolean;
  readonly maxSelections?: number;
  readonly required?: boolean;
  readonly style?: CSSProperties;
}

export function MultiSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  error,
  disabled,
  loading,
  searchable = true,
  maxSelections,
  required,
  style,
}: MultiSelectProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusIndex, setFocusIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    setFocusIndex(-1);
  }, [search, open]);

  const toggle = useCallback(
    (optValue: string) => {
      if (selectedSet.has(optValue)) {
        onChange(value.filter((v) => v !== optValue));
      } else {
        if (maxSelections !== undefined && value.length >= maxSelections) return;
        onChange([...value, optValue]);
      }
    },
    [value, onChange, selectedSet, maxSelections],
  );

  const remove = useCallback(
    (optValue: string) => {
      onChange(value.filter((v) => v !== optValue));
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
        return;
      }
      if (e.key === 'Backspace' && search === '' && value.length > 0) {
        onChange(value.slice(0, -1));
        return;
      }
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          setOpen(true);
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && focusIndex >= 0 && focusIndex < filtered.length) {
        e.preventDefault();
        const opt = filtered[focusIndex];
        if (opt && !opt.disabled) toggle(opt.value);
      }
    },
    [open, search, value, onChange, filtered, focusIndex, toggle],
  );

  useEffect(() => {
    if (focusIndex >= 0 && listRef.current) {
      const el = listRef.current.children[focusIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusIndex]);

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return value.map((v) => ({ value: v, label: map.get(v) ?? v }));
  }, [value, options]);

  const atLimit = maxSelections !== undefined && value.length >= maxSelections;

  return (
    <div ref={containerRef} style={{ ...base, marginBottom: 'var(--maw-space-md)', position: 'relative', ...style }}>
      {label !== undefined && (
        <span style={labelStyle}>
          {label}
          {required && <span style={{ color: 'var(--maw-danger)', marginLeft: 2 }}>*</span>}
        </span>
      )}
      <div
        onClick={() => {
          if (!disabled) {
            setOpen(true);
            inputRef.current?.focus();
          }
        }}
        style={{
          ...base,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          padding: 'var(--maw-space-xs) var(--maw-space-sm)',
          minHeight: 40,
          alignItems: 'center',
          borderRadius: 'var(--maw-radius-md)',
          border: inputBorder(error !== undefined),
          background: disabled ? 'var(--maw-bgMuted)' : 'var(--maw-bg)',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {selectedLabels.map((s) => (
          <span
            key={s.value}
            style={{
              ...base,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 'var(--maw-radius-sm)',
              background: 'var(--maw-bgMuted)',
              fontSize: 'var(--maw-text-xs)',
              color: 'var(--maw-fg)',
            }}
          >
            {s.label}
            {!disabled && (
              <span
                onClick={(e) => { e.stopPropagation(); remove(s.value); }}
                style={{ cursor: 'pointer', fontSize: 14, lineHeight: 1, color: 'var(--maw-fgMuted)' }}
              >
                ✕
              </span>
            )}
          </span>
        ))}
        {searchable && !disabled && (
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            placeholder={value.length === 0 ? placeholder : ''}
            style={{
              ...base,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              flex: 1,
              minWidth: 60,
              fontSize: 'var(--maw-text-md)',
              color: 'var(--maw-fg)',
              padding: '2px 0',
            }}
          />
        )}
        {!searchable && value.length === 0 && (
          <span style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-md)' }}>{placeholder}</span>
        )}
        {loading && (
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid var(--maw-border)',
              borderTopColor: 'var(--maw-brand)',
              borderRadius: '50%',
              animation: 'maw-spin 0.6s linear infinite',
              marginLeft: 'auto',
            }}
          />
        )}
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
            maxHeight: 240,
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
              No options
            </div>
          )}
          {filtered.map((opt, i) => {
            const selected = selectedSet.has(opt.value);
            const isDisabled = opt.disabled || (atLimit && !selected);
            return (
              <div
                key={opt.value}
                onClick={() => { if (!isDisabled) toggle(opt.value); }}
                style={{
                  ...base,
                  padding: 'var(--maw-space-sm) var(--maw-space-md)',
                  fontSize: 'var(--maw-text-sm)',
                  color: isDisabled ? 'var(--maw-fgMuted)' : 'var(--maw-fg)',
                  background: i === focusIndex ? 'var(--maw-bgMuted)' : 'transparent',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--maw-space-sm)',
                  opacity: isDisabled ? 0.5 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  readOnly
                  disabled={isDisabled}
                  tabIndex={-1}
                  style={{ accentColor: 'var(--maw-brand)', width: 16, height: 16, margin: 0, pointerEvents: 'none' }}
                />
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
      {error !== undefined && <span style={errorStyle}>{error}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchableSelect (Autocomplete)
// ---------------------------------------------------------------------------

export interface SearchableSelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SearchableSelectProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options?: readonly SearchableSelectOption[];
  readonly loadOptions?: (query: string) => Promise<readonly SearchableSelectOption[]>;
  readonly placeholder?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly clearable?: boolean;
  readonly debounceMs?: number;
  readonly required?: boolean;
  readonly style?: CSSProperties;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options: staticOptions,
  loadOptions,
  placeholder = 'Search...',
  error,
  disabled,
  loading: externalLoading,
  clearable = true,
  debounceMs = 300,
  required,
  style,
}: SearchableSelectProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [asyncOptions, setAsyncOptions] = useState<readonly SearchableSelectOption[]>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isAsync = loadOptions !== undefined;
  const loading = externalLoading || asyncLoading;

  const options = useMemo(() => {
    if (isAsync) return asyncOptions;
    if (!staticOptions) return [];
    if (!search) return staticOptions;
    const lower = search.toLowerCase();
    return staticOptions.filter((o) => o.label.toLowerCase().includes(lower));
  }, [isAsync, asyncOptions, staticOptions, search]);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const all = isAsync ? asyncOptions : (staticOptions ?? []);
    return all.find((o) => o.value === value)?.label ?? value;
  }, [value, isAsync, asyncOptions, staticOptions]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!isAsync || !open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAsyncLoading(true);
      try {
        const results = await loadOptions(search);
        setAsyncOptions(results);
      } catch {
        setAsyncOptions([]);
      } finally {
        setAsyncLoading(false);
      }
    }, debounceMs);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, open, isAsync, loadOptions, debounceMs]);

  useEffect(() => {
    setFocusIndex(-1);
  }, [search, open]);

  useEffect(() => {
    if (focusIndex >= 0 && listRef.current) {
      const el = listRef.current.children[focusIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
        return;
      }
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          setOpen(true);
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIndex((prev) => Math.min(prev + 1, options.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && focusIndex >= 0 && focusIndex < options.length) {
        e.preventDefault();
        const opt = options[focusIndex];
        if (opt && !opt.disabled) {
          onChange(opt.value);
          setOpen(false);
          setSearch('');
        }
      }
    },
    [open, options, focusIndex, onChange],
  );

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
          ref={inputRef}
          value={open ? search : selectedLabel}
          onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { if (!disabled) { setOpen(true); setSearch(''); } }}
          onKeyDown={handleKeyDown}
          placeholder={value ? selectedLabel : placeholder}
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
        {loading && (
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid var(--maw-border)',
              borderTopColor: 'var(--maw-brand)',
              borderRadius: '50%',
              animation: 'maw-spin 0.6s linear infinite',
              marginRight: 8,
              flexShrink: 0,
            }}
          />
        )}
        {clearable && value && !disabled && !loading && (
          <span
            onClick={() => { onChange(''); setSearch(''); }}
            style={{
              cursor: 'pointer',
              marginRight: 8,
              fontSize: 14,
              color: 'var(--maw-fgMuted)',
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </span>
        )}
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
            maxHeight: 240,
            overflowY: 'auto',
            background: 'var(--maw-bg)',
            border: '1px solid var(--maw-border)',
            borderRadius: 'var(--maw-radius-md)',
            boxShadow: 'var(--maw-shadow-lg)',
            zIndex: 'var(--maw-z-dropdown)' as unknown as number,
          }}
        >
          {options.length === 0 && !loading && (
            <div style={{ padding: 'var(--maw-space-md)', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)', textAlign: 'center' }}>
              {search ? 'No results' : 'No options'}
            </div>
          )}
          {options.map((opt, i) => (
            <div
              key={opt.value}
              onClick={() => {
                if (!opt.disabled) {
                  onChange(opt.value);
                  setOpen(false);
                  setSearch('');
                }
              }}
              style={{
                ...base,
                padding: 'var(--maw-space-sm) var(--maw-space-md)',
                fontSize: 'var(--maw-text-sm)',
                color: opt.disabled ? 'var(--maw-fgMuted)' : 'var(--maw-fg)',
                background: i === focusIndex
                  ? 'var(--maw-bgMuted)'
                  : opt.value === value
                    ? 'var(--maw-bgSubtle)'
                    : 'transparent',
                cursor: opt.disabled ? 'not-allowed' : 'pointer',
                opacity: opt.disabled ? 0.5 : 1,
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

function parseDateISO(dateStr: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  return { year: parseInt(match[1]!, 10), month: parseInt(match[2]!, 10) - 1, day: parseInt(match[3]!, 10) };
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function CalendarPanel({
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
