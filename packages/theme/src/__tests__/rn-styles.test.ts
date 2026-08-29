import { describe, it, expect } from 'vitest';
import { tokensToRNStyles, parseCSSShadow, createTheme } from '../index';

describe('parseCSSShadow', () => {
  it('parses a standard shadow', () => {
    const result = parseCSSShadow('0 4px 6px rgba(0, 0, 0, 0.1)');
    expect(result.shadowColor).toBe('rgba(0, 0, 0, 1)');
    expect(result.shadowOffset).toEqual({ width: 0, height: 4 });
    expect(result.shadowOpacity).toBe(0.1);
    expect(result.shadowRadius).toBe(3);
    expect(result.elevation).toBeGreaterThan(0);
  });

  it('returns zero shadow for "none"', () => {
    const result = parseCSSShadow('none');
    expect(result.shadowOpacity).toBe(0);
    expect(result.elevation).toBe(0);
  });

  it('returns zero opacity for inset shadows', () => {
    const result = parseCSSShadow('inset 0 2px 4px rgba(0, 0, 0, 0.05)');
    expect(result.shadowOpacity).toBe(0);
    expect(result.elevation).toBe(0);
  });
});

describe('tokensToRNStyles', () => {
  it('returns numeric spacing values', () => {
    const styles = tokensToRNStyles();
    expect(typeof styles.spacing.md).toBe('number');
    expect(styles.spacing.md).toBe(12);
  });

  it('returns palette colors as strings', () => {
    const styles = tokensToRNStyles();
    expect(typeof styles.colors.brand).toBe('string');
    expect(styles.colors.brand).toBe('#6366f1');
  });

  it('uses dark palette when dark=true', () => {
    const light = tokensToRNStyles(false);
    const dark = tokensToRNStyles(true);
    expect(light.colors.bg).toBe('#ffffff');
    expect(dark.colors.bg).toBe('#18181b');
    expect(dark.canvas).toBe('#09090b');
    expect(dark.surface).toBe('#18181b');
  });

  it('strips font fallback chains to first face', () => {
    const styles = tokensToRNStyles();
    expect(styles.typography.fontFamily).toBe('Geist Variable');
    expect(styles.typography.fontFamily).not.toContain(',');
  });

  it('returns font weights as strings for RN', () => {
    const styles = tokensToRNStyles();
    expect(styles.typography.weight.bold).toBe('700');
    expect(typeof styles.typography.weight.bold).toBe('string');
  });

  it('produces valid RN shadow objects', () => {
    const styles = tokensToRNStyles();
    expect(styles.shadows.md).toHaveProperty('shadowColor');
    expect(styles.shadows.md).toHaveProperty('shadowOffset');
    expect(styles.shadows.md).toHaveProperty('shadowOpacity');
    expect(styles.shadows.md).toHaveProperty('shadowRadius');
    expect(styles.shadows.md).toHaveProperty('elevation');
    expect(styles.shadows.md.elevation).toBeGreaterThan(0);
  });

  it('respects custom theme overrides', () => {
    const theme = createTheme({ branding: { primaryColor: '#ff0000' } });
    const styles = tokensToRNStyles(false, theme);
    expect(styles.colors.brand).toBe('#ff0000');
  });
});
