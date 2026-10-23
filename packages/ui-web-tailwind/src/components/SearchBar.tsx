import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import type { SearchBarProps } from '@mawsoftwares/ui-contract';
import { Spinner } from './Spinner';

/**
 * Same props as the `SearchBar` in @mawsoftwares/ui-web: `onChange` on every keystroke, debounced `onSearch`, a clear button that
 * calls both with ''. Unlike ui-web, clearing also cancels a pending debounced search (there, a slow `onSearch(oldText)` could still
 * fire after the box was cleared and overwrite the cleared results).
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  debounceMs = 300,
  onSearch,
  loading = false,
  style,
}: SearchBarProps): ReactNode {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    },
    [],
  );

  const handleChange = useCallback(
    (next: string) => {
      onChange(next);
      if (onSearch === undefined) return;
      if (timer.current !== undefined) clearTimeout(timer.current);
      timer.current = setTimeout(() => onSearch(next), debounceMs);
    },
    [onChange, onSearch, debounceMs],
  );

  const clear = (): void => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    onChange('');
    onSearch?.('');
  };

  return (
    <div style={style} className="relative box-border flex items-center font-sans">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 size-4 text-fg-subtle" />
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="box-border w-full rounded-[var(--maw-comp-inputs-border-radius,var(--maw-radius-md))] border border-border bg-[var(--maw-comp-inputs-background,var(--maw-bg))] py-2 pl-9 pr-9 text-sm text-[var(--maw-comp-inputs-text-color,var(--maw-fg))] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle focus:border-brand focus:ring-4 focus:ring-brand/15"
      />
      {loading && <Spinner size={14} className="absolute right-9 border-2" />}
      {value !== '' && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-1.5 inline-flex size-6 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
