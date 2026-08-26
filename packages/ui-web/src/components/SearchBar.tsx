import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// SearchBar
// ---------------------------------------------------------------------------

export interface SearchBarProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly debounceMs?: number;
  readonly onSearch?: (query: string) => void;
  readonly loading?: boolean;
  readonly style?: CSSProperties;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  debounceMs = 300,
  onSearch,
  loading = false,
  style,
}: SearchBarProps): ReactNode {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue);
    if (onSearch) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onSearch(newValue), debounceMs);
    }
  }, [onChange, onSearch, debounceMs]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <div style={{
      ...base,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      ...style,
    }}>
      <span style={{
        position: 'absolute',
        left: 'var(--maw-space-sm)',
        color: 'var(--maw-fgMuted)',
        fontSize: 'var(--maw-text-sm)',
        pointerEvents: 'none',
      }}>🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...base,
          width: '100%',
          padding: 'var(--maw-space-sm) var(--maw-space-lg)',
          paddingLeft: 'calc(var(--maw-space-sm) + 24px)',
          paddingRight: value ? 'calc(var(--maw-space-sm) + 24px)' : 'var(--maw-space-lg)',
          borderRadius: 'var(--maw-radius-md)',
          border: '1px solid var(--maw-border)',
          background: 'var(--maw-bg)',
          color: 'var(--maw-fg)',
          fontSize: 'var(--maw-text-sm)',
          outline: 'none',
        }}
      />
      {loading && (
        <span style={{
          position: 'absolute',
          right: value ? '32px' : 'var(--maw-space-sm)',
          color: 'var(--maw-fgMuted)',
          fontSize: 'var(--maw-text-xs)',
        }}>⏳</span>
      )}
      {value && (
        <button
          onClick={() => { onChange(''); onSearch?.(''); }}
          aria-label="Clear search"
          style={{
            ...base,
            position: 'absolute',
            right: 'var(--maw-space-xs)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--maw-fgMuted)',
            padding: 'var(--maw-space-xs)',
            fontSize: 'var(--maw-text-sm)',
          }}
        >✕</button>
      )}
    </div>
  );
}
