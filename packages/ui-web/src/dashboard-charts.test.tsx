import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MiniBarChart, MiniLineChart } from './dashboard';

describe('chart animation', () => {
  it('bars grow up from the baseline, one after another', () => {
    const html = renderToStaticMarkup(createElement(MiniBarChart, { data: [10, 20, 30] }));
    expect(html).toContain('maw-bar-grow');
    expect(html).toContain('transform-origin:bottom');
    expect(html).toContain('maw-bar-grow 700ms cubic-bezier(0.22, 1, 0.36, 1) 80ms');
  });

  it('the line is drawn from left to right', () => {
    const html = renderToStaticMarkup(createElement(MiniLineChart, { data: [1, 3, 2, 5] }));
    expect(html).toContain('pathLength="1"');
    expect(html).toContain('stroke-dasharray="1"');
    expect(html).toContain('maw-line-draw');
  });

  it('honours reduced motion and can be switched off', () => {
    expect(renderToStaticMarkup(createElement(MiniBarChart, { data: [1, 2] }))).toContain('prefers-reduced-motion');
    expect(renderToStaticMarkup(createElement(MiniBarChart, { data: [1, 2], animate: false }))).not.toContain('maw-bar-grow');
    expect(renderToStaticMarkup(createElement(MiniLineChart, { data: [1, 2], animate: false }))).not.toContain('maw-line-draw');
  });
});
