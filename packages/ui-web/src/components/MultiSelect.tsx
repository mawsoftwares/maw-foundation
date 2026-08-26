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
