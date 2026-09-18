import { useEffect, useRef, useState } from 'react';
import type { ApiError } from './errors';

export interface UseApiRequestResult<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

interface Cancellable {
  cancel?: (reason?: string) => void;
}

function isCancellable(value: unknown): value is Cancellable {
  return typeof value === 'object' && value !== null && 'cancel' in value
    && typeof (value as Cancellable).cancel === 'function';
}

/**
 * React hook wrapper around an `ApiClient` call.
 *
 * `fn` is invoked whenever `deps` changes; if it returns a `CancellablePromise`
 * (as `ApiClient#request`/`#upload` do), the in-flight request is cancelled on
 * unmount or when `deps` changes again before it settles. State is never set
 * after unmount.
 *
 * This lives in a separate `@mawsoftwares/api-client/react` subpath export so
 * the base package has no hard dependency on React — importing from the main
 * entry point never pulls this file in.
 */
export function useApiRequest<T>(
  fn: () => (Promise<T> & Partial<Cancellable>) | Promise<T>,
  deps: unknown[],
): UseApiRequestResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const result = fnRef.current();

    result.then(
      (value) => {
        if (cancelled) return;
        setData(value);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError((err as ApiError) ?? null);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      if (isCancellable(result)) {
        result.cancel?.('unmounted');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}
