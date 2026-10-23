import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Grid } from './Grid';

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;

// The class list reads --c-<bp> / --g-<bp> at EVERY breakpoint, so each must be defined for every input shape —
// an unset variable makes the grid collapse to `grid-template-columns: none` at that width.
function varsOf(props: Parameters<typeof Grid>[0]): Record<string, string> {
  const html = renderToStaticMarkup(createElement(Grid, props));
  const style = /style="([^"]*)"/.exec(html)?.[1] ?? '';
  return Object.fromEntries(
    style
      .split(';')
      .filter((d) => d.startsWith('--'))
      .map((d) => [d.slice(0, d.indexOf(':')), d.slice(d.indexOf(':') + 1)]),
  );
}

describe('Grid', () => {
  it.each([
    ['default', { children: null }],
    ['minChildWidth', { children: null, minChildWidth: 90 }],
    ['numeric columns', { children: null, columns: 3 }],
    ['column string', { children: null, columns: '1fr 2fr' }],
    ['responsive columns', { children: null, columns: { xs: 1, md: 3 } }],
  ] as const)('defines --c-* and --g-* at every breakpoint (%s)', (_name, props) => {
    const vars = varsOf(props);
    for (const bp of BREAKPOINTS) {
      expect(vars[`--c-${bp}`], `--c-${bp}`).toBeTruthy();
      expect(vars[`--g-${bp}`], `--g-${bp}`).toBeTruthy();
    }
  });

  it('carries a smaller breakpoint value up to larger ones', () => {
    const vars = varsOf({ children: null, columns: { xs: 1, md: 3 }, gap: { xs: 4, lg: 16 } });
    expect(vars['--c-sm']).toBe('repeat(1, 1fr)');
    expect(vars['--c-md']).toBe('repeat(3, 1fr)');
    expect(vars['--c-2xl']).toBe('repeat(3, 1fr)');
    expect(vars['--g-md']).toBe('4px');
    expect(vars['--g-xl']).toBe('16px');
  });

  it('minChildWidth takes precedence over columns', () => {
    expect(varsOf({ children: null, columns: 4, minChildWidth: 120 })['--c-md']).toBe('repeat(auto-fill, minmax(120px, 1fr))');
  });
});
