import { useCallback, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { CalendarDays, X } from 'lucide-react';
import { cn } from '../lib/cn';
import type { DateRangePickerProps } from '@mawsoftwares/ui-contract';
import { formatDate, parseISO, toISO } from '../lib/dates';
import { CLEAR_BUTTON_CLASS, CLEAR_TEXT_GAP, POPOVER_CONTENT_CLASS, pickerTriggerClass, rangeDayClassNames } from '../lib/picker';

/**
 * Same props and click behaviour as the `DateRangePicker` in @mawsoftwares/ui-web: first click picks the start,
 * second the end (clicking before the start restarts the range), then the popover closes. react-day-picker
 * draws the range; the two-step state machine is ours so the behaviour matches ui-web exactly.
 */
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
  const start = parseISO(value.start);
  const end = parseISO(value.end);
  const [month, setMonth] = useState<Date>(start ?? new Date());
  const hasError = error !== undefined;
  const hasValue = value.start !== '' || value.end !== '';

  const handleSelect = useCallback(
    (date: string) => {
      if (selecting === 'start') {
        onChange({ start: date, end: value.end !== '' && date <= value.end ? value.end : '' });
        setSelecting('end');
      } else if (date >= value.start) {
        onChange({ start: value.start, end: date });
        setOpen(false);
        setSelecting('start');
      } else {
        onChange({ start: date, end: '' });
        setSelecting('end');
      }
    },
    [selecting, value, onChange],
  );

  const minBound = parseISO(selecting === 'end' && value.start !== '' ? value.start : (min ?? ''));
  const maxBound = parseISO(max ?? '');
  const display =
    value.start !== '' && value.end !== ''
      ? `${formatDate(value.start)} – ${formatDate(value.end)}`
      : value.start !== ''
        ? `${formatDate(value.start)} – …`
        : '';

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
          if (next) {
            setSelecting('start');
            if (start !== undefined) setMonth(start);
          }
        }}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-invalid={hasError || undefined}
            className={pickerTriggerClass(hasError, display === '')}
          >
            <span className={cn('flex-1 truncate', hasValue && disabled !== true && CLEAR_TEXT_GAP)}>{display === '' ? placeholder : display}</span>
            <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
          </button>
        </Popover.Trigger>
        {hasValue && disabled !== true && (
          <button
            type="button"
            aria-label="Clear range"
            onClick={() => onChange({ start: '', end: '' })}
            className={CLEAR_BUTTON_CLASS}
          >
            <X className="size-3.5" />
          </button>
        )}
        <Popover.Portal>
          <Popover.Content align="start" sideOffset={4} className={`${POPOVER_CONTENT_CLASS} p-3`}>
            <div className="pb-2 text-center text-xs text-fg-muted" aria-live="polite">
              {selecting === 'start' ? 'Select start date' : 'Select end date'}
            </div>
            <DayPicker
              mode="range"
              selected={start === undefined ? undefined : { from: start, to: end }}
              onDayClick={(date) => handleSelect(toISO(date))}
              month={month}
              onMonthChange={setMonth}
              disabled={[...(minBound ? [{ before: minBound }] : []), ...(maxBound ? [{ after: maxBound }] : [])]}
              showOutsideDays
              classNames={rangeDayClassNames}
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
