import { useRef, type ReactNode } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import type { DropdownMenuProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';

/**
 * Same props as the `DropdownMenu` in @mawsoftwares/ui-web. Radix DropdownMenu: role="menu"/"menuitem", Arrow/Home/End/typeahead,
 * Escape, focus return. The trigger can be any node (usually a Button or IconButton), so it is wrapped in an inline box that
 * carries the open/close handlers; focus is handed back to the first focusable control inside it on close.
 */
export function DropdownMenu({ trigger, items }: DropdownMenuProps): ReactNode {
  const triggerRef = useRef<HTMLSpanElement>(null);
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <span ref={triggerRef} className="inline-block">
          {trigger}
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={4}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            triggerRef.current?.querySelector<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')?.focus();
          }}
          className="z-[var(--maw-z-dropdown)] box-border min-w-40 animate-popover-in overflow-hidden rounded-[var(--maw-comp-menus-border-radius,var(--maw-radius-md))] border border-border bg-[var(--maw-comp-menus-background,var(--maw-surface))] py-1 font-sans shadow-[var(--maw-comp-menus-shadow,var(--maw-shadow-lg))]"
        >
          {items.map((item) => (
            <Menu.Item
              key={item.key}
              disabled={item.disabled}
              title={item.disabled === true ? item.disabledReason : undefined}
              onSelect={item.onClick}
              className={cn(
                'flex cursor-pointer select-none items-center px-3 py-2 text-[length:var(--maw-comp-menus-font-size,var(--maw-text-sm))] outline-none transition-colors',
                'data-[highlighted]:bg-bg-muted',
                item.danger === true ? 'text-danger' : 'text-[var(--maw-comp-menus-text-color,var(--maw-fg))]',
                'data-[disabled]:cursor-not-allowed data-[disabled]:text-fg-subtle data-[disabled]:opacity-60',
              )}
            >
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
