import type { ReactNode } from 'react';
import * as RadixAccordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import type { AccordionProps } from '@mawsoftwares/ui-contract';

const ITEM_CLASS = 'border-b border-border last:border-b-0';
const TRIGGER_CLASS =
  'group flex w-full cursor-pointer items-center justify-between bg-bg px-4 py-3 text-left text-sm font-semibold text-fg outline-none transition-colors hover:bg-bg-subtle focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand disabled:cursor-not-allowed disabled:text-fg-muted disabled:hover:bg-bg';
const CONTENT_CLASS =
  'overflow-hidden bg-bg text-sm text-fg data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down';

/**
 * Same props as the `Accordion` in @mawsoftwares/ui-web. Radix Accordion: one header = one heading + button with
 * aria-expanded/aria-controls, Up/Down/Home/End between headers. Single mode lets the open item be closed again, as ui-web does.
 * In single mode only the first `defaultExpanded` key is opened (ui-web would open all of them, then close on next click).
 */
export function Accordion({ items, multiple = false, defaultExpanded = [], style }: AccordionProps): ReactNode {
  const body = items.map((item) => (
    <RadixAccordion.Item key={item.key} value={item.key} disabled={item.disabled} className={ITEM_CLASS}>
      <RadixAccordion.Header className="m-0 flex">
        <RadixAccordion.Trigger className={TRIGGER_CLASS}>
          {item.title}
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-fg-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </RadixAccordion.Trigger>
      </RadixAccordion.Header>
      <RadixAccordion.Content className={CONTENT_CLASS}>
        <div className="border-t border-border px-4 py-3">{item.content}</div>
      </RadixAccordion.Content>
    </RadixAccordion.Item>
  ));
  const rootClass = 'box-border overflow-hidden rounded-md border border-border font-sans';

  return multiple ? (
    <RadixAccordion.Root type="multiple" defaultValue={[...defaultExpanded]} style={style} className={rootClass}>
      {body}
    </RadixAccordion.Root>
  ) : (
    <RadixAccordion.Root type="single" collapsible defaultValue={defaultExpanded[0]} style={style} className={rootClass}>
      {body}
    </RadixAccordion.Root>
  );
}
