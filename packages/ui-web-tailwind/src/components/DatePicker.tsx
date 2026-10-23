import { useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { CalendarDays, X } from 'lucide-react';
import { cn } from '../lib/cn';
import type { DatePickerProps } from '@mawsoftwares/ui-contract';
import { formatDate, parseISO, toISO } from '../lib/dates';
import { CLEAR_BUTTON_CLASS, CLEAR_TEXT_GAP, POPOVER_CONTENT_CLASS, pickerTriggerClass, singleDayClassNames } from '../lib/picker';

/**
 * Same props as the `DatePicker` in @mawsoftwares/ui-web. shadcn's recipe: react-day-picker (keyboard grid
 * navigation, ARIA) inside a Radix Popover (outside-click, Escape, focus return). Unlike ui-web it honours `locale`.
 */
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
  locale,
  style,
}: DatePickerProps): ReactNode {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const [month, setMonth] = useState<Date>(selected ?? new Date());
  const minDate = min !== undefined ? parseISO(min) : undefined;
  const maxDate = max !== undefined ? parseISO(max) : undefined;
  const hasError = error !== undefined;

  const display = selected === undefined ? value : formatDate(value, locale);

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
      <Popover.Root
        open={open && disabled !== true}
        onOpenChange={(next) => {
          setOpen(next);
          if (next && selected !== undefined) setMonth(selected);
        }}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-invalid={hasError || undefined}
            className={pickerTriggerClass(hasError, value === '')}
          >
            <span className={cn('flex-1 truncate', value !== '' && disabled !== true && CLEAR_TEXT_GAP)}>{display === '' ? placeholder : display}</span>
            <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
          </button>
        </Popover.Trigger>
        {value !== '' && disabled !== true && (
          <button
            type="button"
            aria-label="Clear date"
            onClick={() => onChange('')}
            className={CLEAR_BUTTON_CLASS}
          >
            <X className="size-3.5" />
          </button>
        )}
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className={`${POPOVER_CONTENT_CLASS} p-3`}
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={(date) => {
                if (date !== undefined) {
                  onChange(toISO(date));
                  setOpen(false);
                }
              }}
              month={month}
              onMonthChange={setMonth}
              disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
              showOutsideDays
              classNames={singleDayClassNames}
            />
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
