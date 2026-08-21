import {
  useState,
  useEffect,
  useSyncExternalStore,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';

// ---------------------------------------------------------------------------
// Breakpoints (matches common Tailwind/MUI breakpoints)
// ---------------------------------------------------------------------------

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// ---------------------------------------------------------------------------
// useMediaQuery — subscribe to a CSS media query
// ---------------------------------------------------------------------------

function getServerSnapshot() { return false; }

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', cb);
    return () => mql.removeEventListener('change', cb);
  }, [query]);

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---------------------------------------------------------------------------
// useBreakpoint — returns the current active breakpoint
// ---------------------------------------------------------------------------

export function useBreakpoint(): Breakpoint | 'xs' {
  const sm = useMediaQuery(`(min-width: ${BREAKPOINTS.sm}px)`);
  const md = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
  const lg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
  const xl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);
  const xxl = useMediaQuery(`(min-width: ${BREAKPOINTS['2xl']}px)`);

  if (xxl) return '2xl';
  if (xl) return 'xl';
  if (lg) return 'lg';
  if (md) return 'md';
  if (sm) return 'sm';
  return 'xs';
}

// ---------------------------------------------------------------------------
// useIsMobile — convenience hook
// ---------------------------------------------------------------------------

export function useIsMobile(): boolean {
  return !useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
}

// ---------------------------------------------------------------------------
// Responsive — show/hide children by breakpoint
// ---------------------------------------------------------------------------

export interface ResponsiveProps {
  readonly children: ReactNode;
  readonly showAbove?: Breakpoint;
  readonly showBelow?: Breakpoint;
  readonly hideAbove?: Breakpoint;
  readonly hideBelow?: Breakpoint;
}

export function Responsive({
  children,
  showAbove,
  showBelow,
  hideAbove,
  hideBelow,
}: ResponsiveProps): ReactNode {
  const above = showAbove ? useMediaQuery(`(min-width: ${BREAKPOINTS[showAbove]}px)`) : true;
  const below = showBelow ? useMediaQuery(`(max-width: ${BREAKPOINTS[showBelow] - 1}px)`) : true;
  const notAbove = hideAbove ? !useMediaQuery(`(min-width: ${BREAKPOINTS[hideAbove]}px)`) : true;
  const notBelow = hideBelow ? !useMediaQuery(`(max-width: ${BREAKPOINTS[hideBelow] - 1}px)`) : true;

  if (!above || !below || !notAbove || !notBelow) return null;
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// VisuallyHidden — accessible content hidden from sighted users
// ---------------------------------------------------------------------------

export interface VisuallyHiddenProps {
  readonly children: ReactNode;
  readonly as?: 'span' | 'div';
}

const hiddenStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function VisuallyHidden({ children, as: Tag = 'span' }: VisuallyHiddenProps): ReactNode {
  return <Tag style={hiddenStyle}>{children}</Tag>;
}

// ---------------------------------------------------------------------------
// useContainerWidth — track a container's width for responsive layouts
// ---------------------------------------------------------------------------

export function useContainerWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
