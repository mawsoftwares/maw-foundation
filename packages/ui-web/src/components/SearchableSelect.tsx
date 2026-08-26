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
// SearchableSelect
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
