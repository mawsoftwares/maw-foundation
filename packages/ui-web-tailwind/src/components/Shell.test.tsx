import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { NavItem } from '@mawsoftwares/ui-contract';
import { AppShellView } from './AppShellView';
import { KpiCard } from './KpiCard';
import { SidebarView } from './SidebarView';
import { Widget } from './Widget';

const noop = (): void => undefined;
const items: NavItem[] = [
  { key: 'dash', label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  {
    key: 'sales',
    label: 'Sales',
    path: '/sales',
    group: 'Business',
    children: [{ key: 'orders', label: 'Orders', path: '/orders' }, { key: 'invoices', label: 'Invoices', path: '/invoices', badge: 3 }],
  },
  { key: 'users', label: 'Users', path: '/users', group: 'Admin' },
];
const base = { items, activeKey: 'dash', collapsed: false, isMobile: false, onNavigate: noop, onToggleCollapsed: noop, onClose: noop };
const sidebar = (props: Partial<Parameters<typeof SidebarView>[0]> = {}): string => renderToStaticMarkup(createElement(SidebarView, { ...base, ...props }));

describe('SidebarView', () => {
  it('lists items under group headings, with the active item marked as the current page', () => {
    const html = sidebar();
    for (const text of ['Dashboard', 'Sales', 'Users', 'Business', 'Admin']) expect(html).toContain(text);
    expect(html).toContain('aria-label="Main"');
    expect(html.match(/aria-current="page"/g)?.length).toBe(1);
  });

  it('keeps nested items collapsed unless a child is active, then opens the parent', () => {
    expect(sidebar()).not.toContain('Invoices');
    const html = sidebar({ activeKey: 'invoices' });
    expect(html).toContain('Orders');
    expect(html).toContain('Invoices');
    expect(html).toContain('aria-expanded="true"');
  });

  it('shows the badge of an item', () => {
    expect(sidebar({ activeKey: 'orders' })).toContain('>3<');
  });

  it('collapses to an icon rail: no labels or group headings, tooltips instead, and the expand button', () => {
    const html = sidebar({ collapsed: true });
    expect(html).not.toContain('>Dashboard<');
    expect(html).not.toContain('Business');
    expect(html).toContain('title="Dashboard"');
    expect(html).toContain('aria-label="Expand"');
  });

  it('on desktop has the collapse toggle and no close button; on mobile the reverse, at full width', () => {
    const desktop = sidebar();
    expect(desktop).toContain('aria-label="Collapse"');
    expect(desktop).not.toContain('Close menu');
    const mobile = sidebar({ isMobile: true });
    expect(mobile).toContain('aria-label="Close menu"');
    expect(mobile).not.toContain('aria-label="Collapse"');
    expect(mobile).toContain('width:100%');
  });

  it('renders logo and title as the brand header, and resolves function slots with the rail state', () => {
    const html = sidebar({ logo: 'LOGO', title: 'Acme', footer: (c: boolean) => (c ? 'F-rail' : 'F-full') });
    expect(html).toContain('LOGO');
    expect(html).toContain('Acme');
    expect(html).toContain('F-full');
    const rail = sidebar({ collapsed: true, logo: 'LOGO', title: 'Acme', footer: (c: boolean) => (c ? 'F-rail' : 'F-full') });
    expect(rail).not.toContain('Acme'); // the title is hidden in the rail
    expect(rail).toContain('F-rail');
  });
});

describe('AppShellView', () => {
  const props = { isMobile: false, menuOpen: false, onMenuToggle: noop, onMenuClose: noop, pageTitle: 'Orders', sidebar: 'SIDEBAR', children: 'CONTENT' };
  const shell = (extra: Record<string, unknown> = {}): string => renderToStaticMarkup(createElement(AppShellView, { ...props, ...extra }));

  it('on desktop renders sidebar, header content, actions, page content and the footer', () => {
    const html = shell({ header: 'CRUMBS', actions: 'ACTIONS' });
    for (const text of ['SIDEBAR', 'CRUMBS', 'ACTIONS', 'CONTENT', 'Powered by', 'MINDS']) expect(html).toContain(text);
    expect(html).not.toContain('aria-label="Menu"');
  });

  it('omits the header when there is nothing to put in it', () => {
    expect(shell()).not.toContain('<header');
  });

  it('on mobile moves the sidebar out of the flow, and shows the menu button and the page title', () => {
    const html = shell({ isMobile: true });
    expect(html).toContain('aria-label="Menu"');
    expect(html).toContain('<h1');
    expect(html).toContain('Orders');
    expect(html).not.toContain('SIDEBAR'); // lives in the (closed) drawer
    expect(html).not.toContain('Powered by');
  });
});

describe('KpiCard', () => {
  it('shows label, value and an upward change in the success colour, announced as "Up"', () => {
    const html = renderToStaticMarkup(createElement(KpiCard, { label: 'Revenue', value: '$12k', change: 12.5, changeLabel: 'vs last month' }));
    for (const text of ['Revenue', '$12k', '12.5%', 'vs last month', 'Up']) expect(html).toContain(text);
    expect(html).toContain('text-success');
  });

  it('shows a downward change in the danger colour using the absolute value', () => {
    const html = renderToStaticMarkup(createElement(KpiCard, { label: 'Churn', value: 4, change: -3 }));
    expect(html).toContain('text-danger');
    expect(html).toContain('Down');
    expect(html).toContain('3%');
    expect(html).not.toContain('-3%');
  });

  it('omits the change row when there is no change, and tints value and icon with `color`', () => {
    const none = renderToStaticMarkup(createElement(KpiCard, { label: 'Users', value: 9 }));
    expect(none).not.toContain('Up');
    expect(none).not.toContain('%');
    expect(renderToStaticMarkup(createElement(KpiCard, { label: 'L', value: 1, color: '#ff0000', icon: 'users' }))).toContain('color:#ff0000');
  });
});

describe('Widget', () => {
  it('renders title, actions and body', () => {
    const html = renderToStaticMarkup(createElement(Widget, { title: 'Orders', actions: 'ACT' }, 'BODY'));
    for (const text of ['Orders', 'ACT', 'BODY']) expect(html).toContain(text);
  });

  it('defines the column span at every breakpoint, carrying smaller values up', () => {
    const html = renderToStaticMarkup(createElement(Widget, { title: 'W', span: { xs: 1, md: 2 } }, 'x'));
    expect(html).toContain('--s-xs:1');
    expect(html).toContain('--s-sm:1');
    expect(html).toContain('--s-md:2');
    expect(html).toContain('--s-2xl:2');
    expect(renderToStaticMarkup(createElement(Widget, { title: 'W' }, 'x'))).toContain('--s-2xl:1'); // default span 1
  });

  it('applies a fixed height', () => {
    expect(renderToStaticMarkup(createElement(Widget, { title: 'W', height: 240 }, 'x'))).toContain('height:240px');
  });
});
