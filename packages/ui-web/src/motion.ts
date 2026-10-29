import { useEffect, useState } from 'react';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Animates each target number from 0 up to its value (ease-out cubic), once on mount and again when a target changes.
 * Ported from the MAW Hub. Settles straight on the targets when the user prefers reduced motion.
 */
export function useCountUp(targets: readonly number[], enabled = true, durationMs = 900, delayMs = 250): number[] {
  const skip = !enabled || prefersReducedMotion();
  const [values, setValues] = useState<number[]>(() => (skip ? [...targets] : targets.map(() => 0)));
  const key = targets.join('|');

  useEffect(() => {
    if (skip) {
      setValues([...targets]);
      return;
    }
    let frame = 0;
    let start: number | undefined;
    const tick = (now: number): void => {
      start ??= now + delayMs;
      const progress = Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - (1 - progress) ** 3;
      setValues(targets.map((t) => Math.round(t * eased)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key, skip, durationMs, delayMs]);

  return values;
}
