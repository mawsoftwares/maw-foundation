import type { ReactNode } from 'react';
import type { SectionProps } from '@mawsoftwares/ui-contract';

/** Same props as the `Section` in @mawsoftwares/ui-web: a titled `<section>` with optional description and actions. */
export function Section({ title, description, children, actions, style }: SectionProps): ReactNode {
  return (
    <section style={style} className="box-border font-sans">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-lg font-semibold text-fg">{title}</h2>
          {description !== undefined && description !== '' && (
            <p className="mb-0 mt-1 text-sm text-fg-muted">{description}</p>
          )}
        </div>
        {actions !== undefined && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
