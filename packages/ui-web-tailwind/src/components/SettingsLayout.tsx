import { useId, type ReactNode } from 'react';
import type { SettingsLayoutProps } from '@mawsoftwares/ui-contract';

/**
 * Same props as the `SettingsLayout` in @mawsoftwares/ui-web: each group is a title/description column beside its controls,
 * with a divider between groups. Unlike ui-web (always two columns), the groups stack on narrow screens (below `md`).
 */
export function SettingsLayout({ groups, style }: SettingsLayoutProps): ReactNode {
  const id = useId();
  return (
    <div style={style} className="box-border font-sans">
      {groups.map((group, i) => {
        const titleId = `${id}-${group.key}`;
        return (
          <section key={group.key} aria-labelledby={titleId}>
            {i > 0 && <div aria-hidden="true" className="my-[var(--maw-space-lg)] border-t border-border" />}
            <div className="grid grid-cols-1 items-start gap-[var(--maw-space-md)] md:grid-cols-2 md:gap-[var(--maw-space-xl)]">
              <div>
                <h3 id={titleId} className="m-0 text-sm font-semibold text-fg">
                  {group.title}
                </h3>
                {group.description !== undefined && group.description !== '' && (
                  <p className="mb-0 mt-1 text-xs leading-normal text-fg-muted">{group.description}</p>
                )}
              </div>
              <div>{group.children}</div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
