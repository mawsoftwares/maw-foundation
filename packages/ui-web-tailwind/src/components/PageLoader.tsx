import type { ReactNode } from 'react';
import type { PageLoaderProps } from '@mawsoftwares/ui-contract';
import { Spinner } from './Spinner';

/** Same props as the `PageLoader` in @mawsoftwares/ui-web: a centred spinner (announced as "Loading") with an optional message. */
export function PageLoader({ message }: PageLoaderProps): ReactNode {
  return (
    <div className="box-border flex min-h-[60vh] flex-col items-center justify-center gap-4 font-sans text-fg-muted">
      <Spinner size={40} />
      {message !== undefined && (
        <span aria-live="polite" className="text-sm">
          {message}
        </span>
      )}
    </div>
  );
}
