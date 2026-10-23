import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BreadcrumbTrail } from './BreadcrumbTrail';
import { LoadingOverlay } from './LoadingOverlay';
import { SettingsLayout } from './SettingsLayout';

const noop = (): void => undefined;

describe('BreadcrumbTrail', () => {
  it('renders nothing for an empty trail', () => {
    expect(renderToStaticMarkup(createElement(BreadcrumbTrail, { items: [], onNavigate: noop }))).toBe('');
  });

  it('is a labelled nav; only non-last items with a path are links; the last item is the current page', () => {
    const html = renderToStaticMarkup(
      createElement(BreadcrumbTrail, {
        items: [{ label: 'Home', path: '/' }, { label: 'Admin' }, { label: 'Users', path: '/users' }],
        onNavigate: noop,
      }),
    );
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html.match(/<button/g)?.length).toBe(1); // Home only: Admin has no path, Users is last
    expect(html).toContain('aria-current="page"');
    expect(html.match(/aria-current="page"/g)?.length).toBe(1);
    expect(html.indexOf('Home')).toBeLessThan(html.indexOf('Admin'));
    expect(html.indexOf('Admin')).toBeLessThan(html.indexOf('Users'));
  });
});

describe('SettingsLayout', () => {
  const groups = [
    { key: 'a', title: 'Profile', description: 'Your details', children: 'A-controls' },
    { key: 'b', title: 'Security', children: 'B-controls' },
    { key: 'c', title: 'Billing', children: 'C-controls' },
  ];

  it('renders every group with its title, controls and optional description', () => {
    const html = renderToStaticMarkup(createElement(SettingsLayout, { groups }));
    for (const text of ['Profile', 'Your details', 'A-controls', 'Security', 'B-controls', 'Billing', 'C-controls']) expect(html).toContain(text);
    expect(html.match(/<p /g)?.length).toBe(1); // only the group with a description gets one
  });

  it('puts a divider between groups (n - 1), not before the first', () => {
    expect(renderToStaticMarkup(createElement(SettingsLayout, { groups })).match(/border-t border-border/g)?.length).toBe(2);
    expect(renderToStaticMarkup(createElement(SettingsLayout, { groups: groups.slice(0, 1) })).match(/border-t border-border/g) ?? []).toHaveLength(0);
  });

  it('labels each group section by its title and stacks on narrow screens', () => {
    const html = renderToStaticMarkup(createElement(SettingsLayout, { groups }));
    expect(html.match(/aria-labelledby=/g)?.length).toBe(3);
    expect(html).toContain('grid-cols-1');
    expect(html).toContain('md:grid-cols-2');
  });
});

describe('LoadingOverlay', () => {
  it('shows only the children (and is not busy) while not loading', () => {
    const html = renderToStaticMarkup(createElement(LoadingOverlay, { loading: false }, 'content'));
    expect(html).toContain('content');
    expect(html).not.toContain('Loading...');
    expect(html).not.toContain('aria-busy');
  });

  it('covers the children with a spinner and the label, and marks the region busy, while loading', () => {
    const html = renderToStaticMarkup(createElement(LoadingOverlay, { loading: true, label: 'Saving…' }, 'content'));
    expect(html).toContain('content');
    expect(html).toContain('Saving…');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
  });

  it('defaults the label', () => {
    expect(renderToStaticMarkup(createElement(LoadingOverlay, { loading: true }, 'x'))).toContain('Loading...');
  });
});
