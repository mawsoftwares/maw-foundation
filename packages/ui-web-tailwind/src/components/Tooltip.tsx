import type { ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { TooltipProps } from '@mawsoftwares/ui-contract';

/**
 * Same props as the `Tooltip` in @mawsoftwares/ui-web. Radix Tooltip: shown on hover AND keyboard focus (ui-web: hover only),
 * dismissed on Escape / press, with viewport collision handling.
 *
 * Disabled controls swallow pointer events in browsers, which would make a "why is this disabled?" tooltip impossible, so
 * the wrapper makes disabled children click-through; the wrapper then receives the hover itself.
 */
export function Tooltip({ content, children }: TooltipProps): ReactNode {
  return (
    <RadixTooltip.Provider delayDuration={0}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          <span className="inline-block [&>:disabled]:pointer-events-none">{children}</span>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side="top"
            sideOffset={4}
            collisionPadding={8}
            className="z-[var(--maw-z-tooltip)] max-w-xs animate-popover-in rounded-[var(--maw-comp-tooltips-border-radius,var(--maw-radius-sm))] bg-[var(--maw-comp-tooltips-background,var(--maw-fg))] px-2 py-1 font-sans text-[length:var(--maw-comp-tooltips-font-size,var(--maw-text-xs))] text-[var(--maw-comp-tooltips-text-color,var(--maw-bg))] shadow-md"
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
