import type { ReactNode } from 'react';
import type { EmptyStateProps } from '@mawsoftwares/ui-contract';
import { Icon } from './Icon';

/**
 * Same props as the `EmptyState` in @mawsoftwares/ui-web. `icon` is rendered through the kit's Icon, so it can be an emoji
 * (as in ui-web) or one of the kit's icon names (`users`, `database`, …); both are decorative and hidden from assistive tech.
 */
export function EmptyState({
  icon = '📭',
  title = 'Nothing here yet',
  message,
  action,
  style,
}: EmptyStateProps): ReactNode {
  return (
    <div style={style} className="box-border p-[var(--maw-space-xxl)] text-center font-sans text-fg-muted">
      <div className="mb-4 flex justify-center text-fg-subtle">
        <Icon name={icon} size={48} strokeWidth={1.5} />
      </div>
      <h3 className="m-0 text-lg font-semibold text-fg">{title}</h3>
      {message !== undefined && <p className="mb-0 mt-2 text-sm">{message}</p>}
      {action !== undefined && <div className="mt-4">{action}</div>}
    </div>
  );
}
