import { useEffect, useRef, type ReactNode } from 'react';
import { PROP_MEASURE, RENDER_PROBES, type Measurements, type RenderProbe } from '@mawsoftwares/theme';
import { Badge, Button, Card, TextField } from './components';
import { useTheme } from './theme';

const BADGE_VARIANTS = { 'badge-default': 'default', 'badge-success': 'success', 'badge-danger': 'danger', 'badge-warning': 'warning', 'badge-info': 'info' } as const;
const BUTTON_VARIANTS = {
  'button-primary': 'primary', 'button-secondary': 'secondary', 'button-outline': 'outline',
  'button-ghost': 'ghost', 'button-destructive': 'destructive', 'button-link': 'link',
} as const;

function renderProbe(probe: RenderProbe): ReactNode {
  if (probe === 'input') return <TextField defaultValue="Probe" />;
  if (probe === 'card') return <Card>Probe</Card>;
  if (probe in BADGE_VARIANTS) return <Badge variant={BADGE_VARIANTS[probe as keyof typeof BADGE_VARIANTS]}>Probe</Badge>;
  return <Button variant={BUTTON_VARIANTS[probe as keyof typeof BUTTON_VARIANTS]}>Probe</Button>;
}

function elementFor(probe: RenderProbe, wrapper: Element): Element | null {
  return probe === 'input' ? wrapper.querySelector('input') : wrapper.firstElementChild;
}

export interface ThemeProbesProps {
  /** Called with computed styles of each probe whenever the theme or colour mode changes. */
  readonly onMeasure: (measurements: Measurements) => void;
  /** Wait for component transitions to finish before reading styles. */
  readonly settleMs?: number;
}

/**
 * Mounts the real Button, TextField, Card and Badge off-screen and reports their computed styles, so a theme
 * can be checked against what a design says (see `compareRendered`) rather than against the tokens we meant to apply.
 */
export function ThemeProbes({ onMeasure, settleMs = 450 }: ThemeProbesProps): ReactNode {
  const { theme, isDark } = useTheme();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const container = root.current;
      if (container === null) return;
      const measured: Partial<Record<RenderProbe, Record<string, string>>> = {};
      for (const probe of RENDER_PROBES) {
        const wrapper = container.querySelector(`[data-probe="${probe}"]`);
        const el = wrapper === null ? null : elementFor(probe, wrapper);
        if (el === null) continue;
        const style = getComputedStyle(el);
        const values: Record<string, string> = {};
        for (const { cssProp } of Object.values(PROP_MEASURE)) values[cssProp] = style.getPropertyValue(cssProp);
        measured[probe] = values;
      }
      onMeasure(measured);
    }, settleMs);
    return () => clearTimeout(timer);
  }, [theme, isDark, onMeasure, settleMs]);

  return (
    <div ref={root} aria-hidden="true" style={{ position: 'absolute', left: -10000, top: 0, width: 400, visibility: 'hidden', pointerEvents: 'none' }}>
      {RENDER_PROBES.map((probe) => (
        <div key={probe} data-probe={probe}>{renderProbe(probe)}</div>
      ))}
    </div>
  );
}
