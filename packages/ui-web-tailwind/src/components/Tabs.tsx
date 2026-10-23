import type { CSSProperties, ReactNode } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';

/**
 * Same props as the `Tabs` in @mawsoftwares/ui-web (a controlled tab strip; the page renders the
 * panel). Built on Radix Tabs for roving focus and arrow-key navigation.
 */
export function Tabs({
  tabs,
  activeTab,
  onChange,
  style,
}: {
  tabs: readonly { key: string; label: string }[];
  activeTab: string;
  onChange: (key: string) => void;
  style?: CSSProperties;
}): ReactNode {
  return (
    <RadixTabs.Root value={activeTab} onValueChange={onChange}>
      <RadixTabs.List
        style={style}
        className="flex gap-1 overflow-x-auto border-b border-[var(--maw-comp-tabs-border-color,var(--maw-border))] font-sans"
      >
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.key}
            value={tab.key}
            className="-mb-px box-border cursor-pointer whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm font-medium text-[var(--maw-comp-tabs-text-color,var(--maw-fgMuted))] transition-colors outline-none hover:text-fg focus-visible:bg-bg-muted data-[state=active]:border-[var(--maw-comp-tabs-active-border-color,var(--maw-brand))] data-[state=active]:font-semibold data-[state=active]:text-[var(--maw-comp-tabs-active-text-color,var(--maw-brand))]"
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
    </RadixTabs.Root>
  );
}
