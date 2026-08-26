import {
  type ReactNode,
  type CSSProperties,
} from 'react';
import { useResponsiveProp, type ResponsiveProp } from '../responsive';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------

export interface StackProps {
  readonly direction?: ResponsiveProp<'row' | 'column'>;
  readonly gap?: ResponsiveProp<string | number>;
  readonly align?: ResponsiveProp<CSSProperties['alignItems']>;
  readonly justify?: ResponsiveProp<CSSProperties['justifyContent']>;
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}

export function Stack({
  direction = 'column',
  gap = 'var(--maw-space-md)',
  align,
  justify,
  children,
  style,
}: StackProps): ReactNode {
  const currentDirection = useResponsiveProp(direction, 'column');
  const currentGap = useResponsiveProp(gap, 'var(--maw-space-md)');
  const currentAlign = useResponsiveProp(align, undefined);
  const currentJustify = useResponsiveProp(justify, undefined);

  return (
    <div style={{ display: 'flex', flexDirection: currentDirection, gap: currentGap, alignItems: currentAlign, justifyContent: currentJustify, ...style }}>
      {children}
    </div>
  );
}
