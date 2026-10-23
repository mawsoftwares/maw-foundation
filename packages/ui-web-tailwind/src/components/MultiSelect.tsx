import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Command } from 'cmdk';
import { Check, X } from 'lucide-react';
import type { MultiSelectProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';
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
 * Same props as the `MultiSelect` in @mawsoftwares/ui-web: chips + inline filter input, options with checkboxes,
 * `maxSelections`, Backspace removes the last chip. shadcn's multi-select recipe: cmdk list in a Radix Popover
 * anchored to the field, so typing never loses focus. Filtering is a plain substring match, like ui-web.
 */
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
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const labelByValue = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);
  const filtered = useMemo(() => {
    if (search === '') return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, search]);
  const active = useActiveItem(filtered);
  const atLimit = maxSelections !== undefined && value.length >= maxSelections;

  const close = (): void => {
    setOpen(false);
    setSearch('');
  };
  const toggle = (optValue: string): void => {
    if (selectedSet.has(optValue)) onChange(value.filter((v) => v !== optValue));
    else if (!atLimit) onChange([...value, optValue]);
  };

  return (
    <div style={style} className="mb-4 box-border font-sans">
      <ComboLabel label={label} required={required} />
      <Command shouldFilter={false} {...active}>
        <ComboPopover
          open={open && disabled !== true}
          onOpenChange={(next) => (next ? setOpen(true) : close())}
          containerRef={containerRef}
          multiple
          anchor={
            <div
              ref={containerRef}
              role={searchable ? undefined : 'combobox'}
              aria-expanded={searchable ? undefined : open}
              tabIndex={searchable || disabled === true ? undefined : 0}
              className={cn(comboContainerClass(error !== undefined, disabled), 'flex-wrap')}
              onClick={() => {
                if (disabled === true) return;
                setOpen(true);
                inputRef.current?.focus();
              }}
              onKeyDown={(e) => {
                if (searchable || disabled === true) return;
                if (e.key === 'ArrowDown' || e.key === 'Enter') {
                  e.preventDefault();
                  setOpen(true);
                }
              }}
            >
              {value.map((v) => {
                const text = labelByValue.get(v) ?? v;
                return (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 rounded-sm bg-bg-muted py-0.5 pl-2 pr-1 text-xs text-fg"
                  >
                    {text}
                    {disabled !== true && (
                      <button
                        type="button"
                        aria-label={`Remove ${text}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange(value.filter((x) => x !== v));
                        }}
                        className="inline-flex size-4 items-center justify-center rounded-sm text-fg-muted transition-colors hover:bg-border hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </span>
                );
              })}
              {searchable && disabled !== true && (
                <Command.Input
                  ref={inputRef}
                  value={search}
                  onValueChange={(next) => {
                    setSearch(next);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && search === '' && value.length > 0) onChange(value.slice(0, -1));
                    else if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
                      e.preventDefault();
                      setOpen(true);
                    }
                  }}
                  placeholder={value.length === 0 ? placeholder : ''}
                  className={COMBO_INPUT_CLASS}
                />
              )}
              {!searchable && value.length === 0 && <span className="px-1 text-base text-fg-subtle">{placeholder}</span>}
              {loading === true && <Spinner size={16} className="ml-auto border-2" />}
            </div>
          }
        >
          <Command.Empty className="p-3 text-center text-sm text-fg-muted">No options</Command.Empty>
          {filtered.map((opt) => {
            const selected = selectedSet.has(opt.value);
            return (
              <Command.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled === true || (atLimit && !selected)}
                onSelect={() => toggle(opt.value)}
                className={COMBO_ITEM_CLASS}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                    selected ? 'border-brand bg-brand text-brand-contrast' : 'border-border',
                  )}
                >
                  {selected && <Check className="size-3" strokeWidth={3} />}
                </span>
                {opt.label}
              </Command.Item>
            );
          })}
        </ComboPopover>
      </Command>
      <ComboError error={error} />
    </div>
  );
}
