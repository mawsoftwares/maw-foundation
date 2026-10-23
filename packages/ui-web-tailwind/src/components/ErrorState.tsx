import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import type { ErrorStateProps } from '@mawsoftwares/ui-contract';
import { Button } from './Button';

/**
 * Same props as the `ErrorState` in @mawsoftwares/ui-web. Announced to assistive tech (`role="alert"`) since it usually appears
 * after a failed load; the retry control is the kit's own Button.
 */
export function ErrorState({ title = 'Error', message, retry, style }: ErrorStateProps): ReactNode {
  return (
    <div role="alert" style={style} className="box-border p-[var(--maw-space-xxl)] text-center font-sans text-fg-muted">
      <TriangleAlert aria-hidden="true" className="mx-auto mb-4 size-12 text-danger" strokeWidth={1.5} />
      <h3 className="m-0 text-lg font-semibold text-fg">{title}</h3>
      {message !== undefined && <p className="mb-0 mt-2 text-sm text-fg-muted">{message}</p>}
      {retry !== undefined && (
        <div className="mt-4">
          <Button variant="ghost" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
