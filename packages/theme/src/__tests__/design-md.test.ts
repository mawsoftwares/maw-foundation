import { describe, it, expect } from 'vitest';
import { parseDesignMarkdown } from '../index';

describe('parseDesignMarkdown', () => {
  it('parses recognized color/font/radius tokens', () => {
    const result = parseDesignMarkdown(`
# Design Tokens
- **Primary Color**: #4f46e5
- Secondary Color: #818cf8
- Accent Color: #4338ca
- Font Family: Inter
- Border Radius: 12px
`);
    expect(result.branding).toEqual({
      primaryColor: '#4f46e5',
      secondaryColor: '#818cf8',
      accentColor: '#4338ca',
      fontFamily: 'Inter',
      borderRadius: 12,
    });
    expect(result.warnings).toHaveLength(0);
    expect(result.recognized).toHaveLength(5);
  });

  it('accepts 3-digit hex colors', () => {
    const result = parseDesignMarkdown('- Primary Color: #4f6');
    expect(result.branding.primaryColor).toBe('#4f6');
  });

  it('warns and skips invalid color values', () => {
    const result = parseDesignMarkdown('- Primary Color: not-a-color');
    expect(result.branding.primaryColor).toBeUndefined();
    expect(result.warnings).toHaveLength(1);
  });

  it('warns and skips invalid border radius values', () => {
    const result = parseDesignMarkdown('- Border Radius: not-a-number');
    expect(result.branding.borderRadius).toBeUndefined();
    expect(result.warnings).toHaveLength(1);
  });

  it('ignores unrecognized keys and heading lines without failing', () => {
    const result = parseDesignMarkdown('# Heading\n- Some Unknown Field: value\n- Primary Color: #000000');
    expect(result.branding).toEqual({ primaryColor: '#000000' });
    expect(result.warnings).toHaveLength(0);
  });

  it('reports a warning when nothing is recognized', () => {
    const result = parseDesignMarkdown('Just some prose with no tokens.');
    expect(result.recognized).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });
});
