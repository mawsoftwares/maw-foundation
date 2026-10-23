import type { ReactNode } from 'react';
import * as Switch from '@radix-ui/react-switch';
import type { ToggleProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';

/** Same props as the `Toggle` in @mawsoftwares/ui-web. Radix Switch: role="switch", Space/Enter, focus ring. */
export function Toggle({ checked, onChange, label, disabled, style }: ToggleProps): ReactNode {
  return (
    <label
      style={style}
      className={cn(
        'inline-flex items-center gap-2 font-sans',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <Switch.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={label === undefined ? 'Toggle' : undefined}
        className="relative h-6 w-11 shrink-0 rounded-full bg-[var(--maw-comp-toggles-background,var(--maw-border))] transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand/25 data-[state=checked]:bg-[var(--maw-comp-toggles-active-background,var(--maw-brand))]"
      >
        <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-[var(--maw-comp-toggles-thumb-background,#ffffff)] shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
      {label !== undefined && <span className="text-base text-fg">{label}</span>}
    </label>
  );
}
