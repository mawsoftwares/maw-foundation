import type { ClassNames } from 'react-day-picker';
import { cn } from './cn';

/** Trigger button shared by DatePicker / DateRangePicker / TimePicker (looks like TextField). */
export function pickerTriggerClass(hasError: boolean, empty: boolean): string {
  return cn(
    'box-border flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-[var(--maw-comp-inputs-border-radius,var(--maw-radius-md))] border bg-[var(--maw-comp-inputs-background,var(--maw-bg))] py-2 pl-3 pr-3 text-left text-base transition-[border-color,box-shadow] duration-150 outline-none',
    'focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15 data-[state=open]:border-brand',
    'disabled:cursor-not-allowed disabled:bg-bg-muted disabled:opacity-60',
    hasError ? 'border-danger' : 'border-border',
    empty ? 'text-fg-subtle' : 'text-fg',
  );
}

export const POPOVER_CONTENT_CLASS =
  'z-[var(--maw-z-dropdown)] animate-popover-in rounded-md border border-border bg-bg font-sans text-fg shadow-lg outline-none';

/** Reserve room for the clear button (it sits just left of the trigger's icon) so long text truncates before it. */
export const CLEAR_TEXT_GAP = 'mr-7';

export const CLEAR_BUTTON_CLASS =
  'absolute bottom-[9px] right-9 inline-flex size-6 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand';

const navButton =
  'inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand';

/** react-day-picker class map, shadcn-style. Range days: only start/end/middle are tinted (not `selected`). */
export const calendarClassNames: Partial<ClassNames> = {
  root: 'text-sm',
  months: 'relative',
  month_caption: 'flex h-9 items-center justify-center',
  caption_label: 'text-sm font-semibold text-fg',
  nav: 'absolute inset-x-0 top-0 flex h-9 items-center justify-between',
  button_previous: navButton,
  button_next: navButton,
  chevron: 'size-4 fill-current',
  month_grid: 'mt-2 border-collapse',
  weekdays: '',
  weekday: 'size-9 text-center text-xs font-semibold text-fg-muted',
  week: '',
  day: 'p-0 text-center',
  day_button:
    'inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-sm text-fg transition-colors outline-none hover:bg-bg-muted focus-visible:ring-2 focus-visible:ring-brand',
  today: '[&>button]:font-bold [&>button]:ring-1 [&>button]:ring-brand [&>button]:ring-inset',
  outside: '[&>button]:text-fg-subtle',
  disabled: '[&>button]:cursor-not-allowed [&>button]:opacity-40 [&>button]:hover:bg-transparent',
  hidden: 'invisible',
};

export const singleDayClassNames: Partial<ClassNames> = {
  ...calendarClassNames,
  selected: '[&>button]:bg-brand [&>button]:text-brand-contrast [&>button]:hover:bg-brand',
};

export const rangeDayClassNames: Partial<ClassNames> = {
  ...calendarClassNames,
  selected: '',
  range_start: '[&>button]:bg-brand [&>button]:text-brand-contrast [&>button]:hover:bg-brand',
  range_end: '[&>button]:bg-brand [&>button]:text-brand-contrast [&>button]:hover:bg-brand',
  range_middle: '[&>button]:rounded-none [&>button]:bg-brand/15 [&>button]:hover:bg-brand/25',
};
