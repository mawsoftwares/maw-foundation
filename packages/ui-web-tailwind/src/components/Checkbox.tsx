import type { CSSProperties, ReactNode } from 'react';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '../lib/cn';

/** Same props as the `Checkbox` in @mawsoftwares/ui-web. Radix Checkbox (keyboard + ARIA), shadcn styling. */
export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  style,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  style?: CSSProperties;
}): ReactNode {
  return (
    <label
      style={style}
      className={cn(
        'flex items-center gap-2 font-sans text-base text-fg',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <RadixCheckbox.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange(next === true)}
        // Unlabelled checkboxes (table rows) still need an accessible name.
        aria-label={label === '' ? 'Select' : undefined}
        className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-border bg-bg transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand/20 data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-contrast"
      >
        <RadixCheckbox.Indicator>
          <Check className="size-3.5" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label}
    </label>
  );
}
