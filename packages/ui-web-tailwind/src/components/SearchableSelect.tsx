import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Command } from 'cmdk';
import { Check, X } from 'lucide-react';
import type { SearchableSelectOption, SearchableSelectProps } from '@mawsoftwares/ui-contract';
import {
  COMBO_INPUT_CLASS,
  COMBO_ITEM_CLASS,
  ComboError,
  ComboLabel,
  ComboPopover,
  comboContainerClass,
  useActiveItem,
} from '../lib/combo';
import { Spinner } from './Spinner';

/**
 * Same props as the `SearchableSelect` in @mawsoftwares/ui-web: static `options` filtered locally, or an async
 * `loadOptions(query)` called (debounced) while the list is open. cmdk list in a Radix Popover anchored to the input.
 * Unlike ui-web, a slow response that arrives after a newer query is discarded instead of overwriting it.
 */
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
  const containerRef = useRef<HTMLDivElement>(null);

  const isAsync = loadOptions !== undefined;
  const loading = externalLoading === true || asyncLoading;

  const options = useMemo(() => {
    if (isAsync) return asyncOptions;
    if (staticOptions === undefined) return [];
    if (search === '') return staticOptions;
    const lower = search.toLowerCase();
    return staticOptions.filter((o) => o.label.toLowerCase().includes(lower));
  }, [isAsync, asyncOptions, staticOptions, search]);

  const selectedLabel = useMemo(() => {
    if (value === '') return '';
    const all = isAsync ? asyncOptions : (staticOptions ?? []);
    return all.find((o) => o.value === value)?.label ?? value;
  }, [value, isAsync, asyncOptions, staticOptions]);

  const active = useActiveItem(options, value === '' ? undefined : value);

  useEffect(() => {
    if (loadOptions === undefined || !open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setAsyncLoading(true);
      loadOptions(search)
        .then((results) => {
          if (!cancelled) setAsyncOptions(results);
        })
        .catch(() => {
          if (!cancelled) setAsyncOptions([]);
        })
        .finally(() => {
          if (!cancelled) setAsyncLoading(false);
        });
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, open, loadOptions, debounceMs]);

  const close = (): void => {
    setOpen(false);
    setSearch('');
  };

  return (
    <div style={style} className="mb-4 box-border font-sans">
      <ComboLabel label={label} required={required} />
      <Command shouldFilter={false} {...active}>
        <ComboPopover
          open={open && disabled !== true}
          onOpenChange={(next) => (next ? setOpen(true) : close())}
          containerRef={containerRef}
          anchor={
            <div ref={containerRef} className={comboContainerClass(error !== undefined, disabled)}>
              <Command.Input
                value={open ? search : selectedLabel}
                onValueChange={(next) => {
                  setSearch(next);
                  setOpen(true);
                }}
                onFocus={() => {
                  if (disabled !== true) {
                    setOpen(true);
                    setSearch('');
                  }
                }}
                onKeyDown={(e) => {
                  if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
                    e.preventDefault();
                    setOpen(true);
                  }
                }}
                placeholder={value !== '' ? selectedLabel : placeholder}
                disabled={disabled}
                className={COMBO_INPUT_CLASS}
              />
              {loading && <Spinner size={16} className="mr-1 border-2" />}
              {clearable && value !== '' && disabled !== true && !loading && (
                <button
                  type="button"
                  aria-label="Clear selection"
                  onClick={() => {
                    onChange('');
                    setSearch('');
                  }}
                  className="mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          }
        >
          {!loading && (
            <Command.Empty className="p-3 text-center text-sm text-fg-muted">
              {search === '' ? 'No options' : 'No results'}
            </Command.Empty>
          )}
          {options.map((opt) => (
            <Command.Item
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled === true}
              onSelect={() => {
                onChange(opt.value);
                close();
              }}
              className={COMBO_ITEM_CLASS}
            >
              <span className="flex-1">{opt.label}</span>
              {opt.value === value && <Check className="size-4 text-brand" />}
            </Command.Item>
          ))}
        </ComboPopover>
      </Command>
      <ComboError error={error} />
    </div>
  );
}
