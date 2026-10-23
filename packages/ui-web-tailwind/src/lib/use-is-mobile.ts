import { useSyncExternalStore } from 'react';

// Same rule as ui-web's useIsMobile: below the `md` breakpoint (768px).
const QUERY = '(min-width: 768px)';

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function useIsMobile(): boolean {
  return !useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
