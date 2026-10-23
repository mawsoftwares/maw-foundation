import { useMemo, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, Clock, X } from 'lucide-react';
import type { TimePickerProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';
import { CLEAR_BUTTON_CLASS, CLEAR_TEXT_GAP, POPOVER_CONTENT_CLASS, pickerTriggerClass } from '../lib/picker';

interface TimeOption {
  readonly value: string;
  readonly label: string;
}

// Same slot generation as ui-web: every `step` minutes, 24-hour `HH:mm` values, optional min/max bounds.
function generateTimeOptions(step: number, use24Hour: boolean, min?: string, max?: string): TimeOption[] {
  const options: TimeOption[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += step) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (min !== undefined && min !== '' && value < min) continue;
    if (max !== undefined && max !== '' && value > max) continue;
    const label = use24Hour
      ? value
      : `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    options.push({ value, label });
  }
  return options;
}

/**
 * Same props as the `TimePicker` in @mawsoftwares/ui-web. shadcn's combobox recipe: cmdk (type to filter,
 * arrow keys, Enter) inside a Radix Popover. Filtering is a plain substring match like ui-web, not cmdk's fuzzy match.
 */
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
  const options = useMemo(() => generateTimeOptions(step, use24Hour, min, max), [step, use24Hour, min, max]);
  const selected = options.find((o) => o.value === value);
  const shown = value === '' ? '' : (selected?.label ?? value);
  const hasError = error !== undefined;

  return (
    <div style={style} className="relative mb-4 box-border font-sans">
      {label !== undefined && (
        <span className="mb-1.5 block text-sm font-medium text-fg-muted">
          {label}
          {required === true && (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          )}
        </span>
      )}
      <Popover.Root open={open && disabled !== true} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            className={pickerTriggerClass(hasError, value === '')}
          >
            <span className={cn('flex-1 truncate', value !== '' && disabled !== true && CLEAR_TEXT_GAP)}>{shown === '' ? placeholder : shown}</span>
            <Clock aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
          </button>
        </Popover.Trigger>
        {value !== '' && disabled !== true && (
          <button type="button" aria-label="Clear time" onClick={() => onChange('')} className={CLEAR_BUTTON_CLASS}>
            <X className="size-3.5" />
          </button>
        )}
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className={cn(POPOVER_CONTENT_CLASS, 'w-[var(--radix-popover-trigger-width)] overflow-hidden p-0')}
            onOpenAutoFocus={() => {
              // Bring the current value into view, like ui-web's list.
              requestAnimationFrame(() =>
                document.querySelector('[data-time-picker] [data-checked=true]')?.scrollIntoView({ block: 'center' }),
              );
            }}
          >
            <Command
              data-time-picker=""
              value={selected?.label}
              filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
            >
              <Command.Input
                placeholder="Search time…"
                className="box-border w-full border-b border-border bg-transparent px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle"
              />
              <Command.List className="max-h-52 overflow-y-auto p-1">
                <Command.Empty className="p-3 text-center text-sm text-fg-muted">No times</Command.Empty>
                {options.map((opt) => (
                  <Command.Item
                    key={opt.value}
                    value={opt.label}
                    data-checked={opt.value === value}
                    onSelect={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-sm px-3 py-1.5 text-sm text-fg data-[selected=true]:bg-bg-muted data-[checked=true]:font-semibold"
                  >
                    {opt.label}
                    {opt.value === value && <Check className="size-4 text-brand" />}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {hasError && (
        <span role="alert" className="mt-1.5 block text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
