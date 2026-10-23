import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { cn } from './cn';
import { POPOVER_CONTENT_CLASS } from './picker';

/** Field-like container that holds chips / the inline input; focus-within draws the same ring as TextField. */
export function comboContainerClass(hasError: boolean, disabled: boolean | undefined): string {
  return cn(
    'box-border flex min-h-10 w-full items-center gap-1 rounded-[var(--maw-comp-inputs-border-radius,var(--maw-radius-md))] border bg-[var(--maw-comp-inputs-background,var(--maw-bg))] px-2 py-1 transition-[border-color,box-shadow] duration-150',
    'focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15',
    hasError ? 'border-danger focus-within:border-danger focus-within:ring-danger/15' : 'border-border',
    disabled === true ? 'cursor-not-allowed bg-bg-muted opacity-60' : 'cursor-text',
  );
}

export const COMBO_INPUT_CLASS =
  'min-w-[60px] flex-1 border-none bg-transparent px-1 py-0.5 text-base text-[var(--maw-comp-inputs-text-color,var(--maw-fg))] outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed';

export const COMBO_ITEM_CLASS =
  'flex cursor-pointer items-center gap-2 rounded-sm px-3 py-1.5 text-sm text-fg data-[selected=true]:bg-bg-muted data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50';

export function ComboLabel({ label, required }: { label: string | undefined; required: boolean | undefined }): ReactNode {
  if (label === undefined) return null;
  return (
    <span className="mb-1.5 block text-sm font-medium text-fg-muted">
      {label}
      {required === true && (
        <span aria-hidden="true" className="ml-0.5 text-danger">
          *
        </span>
      )}
    </span>
  );
}

export function ComboError({ error }: { error: string | undefined }): ReactNode {
  if (error === undefined) return null;
  return (
    <span role="alert" className="mt-1.5 block text-xs text-danger">
      {error}
    </span>
  );
}

/**
 * Popover list anchored to the field container (not a trigger), so the inline input keeps focus while the list is open.
 * Pointer/focus events inside the container must not count as "outside" or the list would close on every click into the input.
 * Must be rendered inside a cmdk <Command>.
 */
export function ComboPopover({
  open,
  onOpenChange,
  containerRef,
  anchor,
  multiple,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerRef: RefObject<HTMLElement | null>;
  anchor: ReactNode;
  multiple?: boolean;
  children: ReactNode;
}): ReactNode {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Anchor asChild>{anchor}</Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className={cn(POPOVER_CONTENT_CLASS, 'w-[var(--radix-popover-trigger-width)] overflow-hidden p-0')}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (containerRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
        >
          <Command.List aria-multiselectable={multiple || undefined} className="max-h-60 overflow-y-auto p-1">
            {children}
          </Command.List>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * Keeps one list item highlighted so Enter always selects something. cmdk only re-highlights when ITS filter runs; we
 * filter ourselves (and, for async sources, the list changes long after the keystroke), so we drive the highlight:
 * the preferred value (the current selection) if present, else the first enabled option. Pass the result to <Command>.
 *
 * Resets only when the option CONTENT changes (callers often pass a fresh array each render), so toggling an item in a
 * multi-select does not throw the highlight back to the top.
 */
export function useActiveItem(
  options: readonly { readonly value: string; readonly disabled?: boolean }[],
  preferred?: string,
): { value: string; onValueChange: (value: string) => void } {
  const [active, setActive] = useState('');
  const signature = options.map((o) => `${o.value}${o.disabled === true ? '!' : ''}`).join('\u0000');
  useEffect(() => {
    const pick =
      (preferred === undefined ? undefined : options.find((o) => o.value === preferred && o.disabled !== true)) ??
      options.find((o) => o.disabled !== true);
    setActive(pick?.value ?? '');
    // `options` is intentionally represented by `signature`: only a content change should reset the highlight.
  }, [signature, preferred]);
  return { value: active, onValueChange: setActive };
}
