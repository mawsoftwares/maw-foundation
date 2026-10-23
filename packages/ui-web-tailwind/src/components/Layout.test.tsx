import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Divider } from './Divider';
import { Skeleton } from './Skeleton';
import { Spacer } from './Spacer';

describe('Divider', () => {
  it('renders an hr and lets style override the default spacing', () => {
    const html = renderToStaticMarkup(createElement(Divider, { style: { margin: 0 } }));
    expect(html.startsWith('<hr')).toBe(true);
    expect(html).toContain('margin:0');
  });
});

describe('Spacer', () => {
  it('is a full-width block of the given height when vertical (default)', () => {
    const html = renderToStaticMarkup(createElement(Spacer, { size: '12px' }));
    expect(html).toContain('height:12px');
    expect(html).toContain('w-full');
    expect(html).toContain('aria-hidden="true"');
  });

  it('is an inline block of the given width when horizontal', () => {
    const html = renderToStaticMarkup(createElement(Spacer, { size: '2rem', axis: 'horizontal' }));
    expect(html).toContain('width:2rem');
    expect(html).toContain('inline-block');
  });
});

describe('Skeleton', () => {
  it('takes px for numbers and any CSS length for strings, and is hidden from assistive tech', () => {
    const html = renderToStaticMarkup(createElement(Skeleton, { width: 120, height: 32, borderRadius: 'var(--maw-radius-md)' }));
    expect(html).toContain('width:120px');
    expect(html).toContain('height:32px');
    expect(html).toContain('border-radius:var(--maw-radius-md)');
    expect(html).toContain('aria-hidden="true"');
  });

  it('shimmers, but not for reduced-motion users', () => {
    const html = renderToStaticMarkup(createElement(Skeleton, {}));
    expect(html).toContain('animate-shimmer');
    expect(html).toContain('motion-reduce:animate-none');
  });
});
