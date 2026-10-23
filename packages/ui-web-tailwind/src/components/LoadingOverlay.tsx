import type { ReactNode } from 'react';
import type { LoadingOverlayProps } from '@mawsoftwares/ui-contract';
import { Spinner } from './Spinner';

/**
 * Same props as the `LoadingOverlay` in @mawsoftwares/ui-web: covers its children with a dimmed layer, a white spinner and a label while
 * `loading`. The wrapper is marked `aria-busy` so assistive tech knows the region is updating.
 */
export function LoadingOverlay({ loading, children, label = 'Loading...' }: LoadingOverlayProps): ReactNode {
  return (
    <div className="relative box-border" aria-busy={loading || undefined}>
      {children}
      {loading && (
        <div className="absolute inset-0 z-[var(--maw-z-overlay)] flex flex-col items-center justify-center gap-2 rounded-md bg-[var(--maw-overlay)] font-sans">
          <Spinner size={32} className="border-white/30 border-t-white" />
          <span className="text-sm text-white">{label}</span>
        </div>
      )}
    </div>
  );
}
