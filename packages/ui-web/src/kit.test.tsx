import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { setUIKit, type UIKit } from '@mawsoftwares/ui-contract';
import { Badge, Button, Spinner, getDefaultKit, resolveKit } from './kit';
import { ProfileAvatarUpload } from './components/ProfileAvatarUpload';
import { WidgetGrid } from './dashboard';
import { Overlay as WebOverlay } from './components/Overlay';
import { ErrorBoundary, SkeletonRows, SkeletonText } from './states';
import { AppShell, Breadcrumbs, NavigationProvider, Sidebar } from './navigation';
import { KpiGrid } from './dashboard';
import { AutocompleteField, CheckboxField, RadioField, DateField, DateRangeField, EmailField, MultiSelectField, TimeField } from './fields';

const marker = (label: string) => (): ReactNode => createElement('i', { 'data-kit': label });

describe('ui-web kit resolver', () => {
  afterEach(() => setUIKit({}));

  it('uses the default (ui-web) kit when nothing is installed', () => {
    expect(resolveKit()).toEqual(getDefaultKit());
    const html = renderToStaticMarkup(createElement(Button, null, 'Save'));
    expect(html).toContain('maw-btn');
    expect(html).toContain('Save');
  });

  it('renders an installed kit override instead, per component', () => {
    setUIKit({ Button: marker('custom-button') as UIKit['Button'] });
    expect(renderToStaticMarkup(createElement(Button, null, 'Save'))).toBe('<i data-kit="custom-button"></i>');
    // components the override omits keep the default implementation
    expect(renderToStaticMarkup(createElement(Badge, { variant: 'success' }, 'Paid'))).toContain('Paid');
  });

  it('switches back when the kit is cleared', () => {
    setUIKit({ Spinner: marker('x') as UIKit['Spinner'] });
    expect(renderToStaticMarkup(createElement(Spinner, {}))).toContain('data-kit="x"');
    setUIKit({});
    expect(renderToStaticMarkup(createElement(Spinner, {}))).not.toContain('data-kit');
  });

  it('memoises the merged kit until the override changes', () => {
    const a = resolveKit();
    expect(resolveKit()).toBe(a);
    setUIKit({ Spinner: marker('y') as UIKit['Spinner'] });
    expect(resolveKit()).not.toBe(a);
  });

  // Regression: the ready-made fields in fields.tsx once imported their primitives straight from
  // ./components, bypassing the kit. Every field below must render the installed kit's component.
  it('routes the ready-made fields (fields.tsx) through the installed kit', () => {
    setUIKit({
      DatePicker: marker('date') as UIKit['DatePicker'],
      DateRangePicker: marker('range') as UIKit['DateRangePicker'],
      TimePicker: marker('time') as UIKit['TimePicker'],
      TextField: marker('text') as UIKit['TextField'],
      Checkbox: marker('check') as UIKit['Checkbox'],
      MultiSelect: marker('multi') as UIKit['MultiSelect'],
      SearchableSelect: marker('search') as UIKit['SearchableSelect'],
      RadioGroup: marker('radio') as UIKit['RadioGroup'],
      Avatar: marker('avatar') as UIKit['Avatar'],
      IconButton: marker('iconbtn') as UIKit['IconButton'],
      Grid: marker('grid') as UIKit['Grid'],
    });
    const html = (node: ReactNode) => renderToStaticMarkup(createElement('div', null, node));
    expect(html(createElement(DateField, { value: '', onChange: () => undefined }))).toContain('data-kit="date"');
    expect(html(createElement(DateRangeField, { value: { start: '', end: '' }, onChange: () => undefined }))).toContain('data-kit="range"');
    expect(html(createElement(TimeField, { value: '', onChange: () => undefined }))).toContain('data-kit="time"');
    expect(html(createElement(EmailField, { value: '', onChange: () => undefined }))).toContain('data-kit="text"');
    expect(html(createElement(CheckboxField, { checked: false, onChange: () => undefined, label: 'x' }))).toContain('data-kit="check"');
    expect(html(createElement(MultiSelectField, { value: [], onChange: () => undefined, options: [] }))).toContain('data-kit="multi"');
    // dashboard.tsx composes Grid (it was the last direct importer of Grid)
    expect(html(createElement(WidgetGrid, { children: null }))).toContain('data-kit="grid"');
    expect(html(createElement(RadioField, { name: 'r', value: '', onChange: () => undefined, options: [] }))).toContain('data-kit="radio"');
    expect(
      html(createElement(ProfileAvatarUpload, { name: 'Asha', upload: () => Promise.reject(new Error('unused')), onChange: () => undefined })),
    ).toContain('data-kit="avatar"');
    expect(html(createElement(AutocompleteField, { value: '', onChange: () => undefined }))).toContain('data-kit="search"');
  });

  it("renders Overlay's modal layout with the kit's Modal and its drawer layout with the kit's Drawer", () => {
    setUIKit({
      Modal: marker('modal') as UIKit['Modal'],
      Drawer: marker('drawer') as UIKit['Drawer'],
    });
    const base = { open: true, onClose: () => undefined, children: null };
    expect(renderToStaticMarkup(createElement(WebOverlay, { ...base, layout: 'modal' }))).toContain('data-kit="modal"');
    expect(renderToStaticMarkup(createElement(WebOverlay, { ...base, layout: 'drawer' }))).toContain('data-kit="drawer"');
    // drawer is the default layout
    expect(renderToStaticMarkup(createElement(WebOverlay, base))).toContain('data-kit="drawer"');
  });

  it("renders SkeletonText / SkeletonRows with the kit's Skeleton (they used to keep ui-web's shimmer)", () => {
    setUIKit({ Skeleton: marker('skel') as UIKit['Skeleton'] });
    const count = (html: string) => (html.match(/data-kit="skel"/g) ?? []).length;
    expect(count(renderToStaticMarkup(createElement(SkeletonText, { lines: 2 })))).toBe(2);
    expect(count(renderToStaticMarkup(createElement(SkeletonRows, { rows: 2, columns: 3 })))).toBe(6);
    setUIKit({});
    expect(count(renderToStaticMarkup(createElement(SkeletonText, { lines: 2 })))).toBe(0);
  });

  it("renders ErrorBoundary's default fallback with the kit's ErrorState", () => {
    // Error boundaries do not run under server rendering, so put the boundary in its failed state and render its fallback.
    const boundary = new ErrorBoundary({ children: null });
    boundary.state = { error: new Error('boom') };
    setUIKit({ ErrorState: marker('err') as UIKit['ErrorState'] });
    expect(renderToStaticMarkup(boundary.render() as ReactNode)).toContain('data-kit="err"');
    setUIKit({});
    expect(renderToStaticMarkup(boundary.render() as ReactNode)).toContain('boom');
  });

  it("renders the context-bound Breadcrumbs with the kit's BreadcrumbTrail, passing the trail and navigate through", () => {
    const calls: unknown[] = [];
    setUIKit({
      BreadcrumbTrail: ((props: Parameters<UIKit['BreadcrumbTrail']>[0]) => {
        calls.push(props);
        return createElement('i', { 'data-kit': 'trail' });
      }) as UIKit['BreadcrumbTrail'],
    });
    const crumbs = [{ label: 'Home', path: '/dashboard' }, { label: 'Orders' }];
    const html = renderToStaticMarkup(
      createElement(
        NavigationProvider,
        { config: { items: [], activeKey: '', onNavigate: () => undefined, breadcrumbs: crumbs } },
        createElement(Breadcrumbs),
      ),
    );
    expect(html).toContain('data-kit="trail"');
    const props = calls[0] as { items: unknown; onNavigate: unknown };
    expect(props.items).toEqual(crumbs);
    expect(typeof props.onNavigate).toBe('function');
  });

  it('ui-web BreadcrumbTrail renders nothing for an empty trail and marks the last item as text', () => {
    const empty = renderToStaticMarkup(createElement(getDefaultKit().BreadcrumbTrail as never, { items: [], onNavigate: () => undefined }));
    expect(empty).toBe('');
    const html = renderToStaticMarkup(
      createElement(getDefaultKit().BreadcrumbTrail as never, { items: [{ label: 'Home', path: '/' }, { label: 'Orders', path: '/orders' }], onNavigate: () => undefined }),
    );
    expect(html.match(/<button/g)?.length).toBe(1); // only the non-last item with a path is a link
    expect(html).toContain('Orders');
  });

  describe('shell composites hand the navigation context to the kit views', () => {
    const items = [
      { key: 'dash', label: 'Dashboard', path: '/dashboard' },
      { key: 'orders', label: 'Orders', path: '/orders', group: 'Sales' },
    ];
    const capture = <K extends 'SidebarView' | 'AppShellView'>(name: K, store: unknown[]): UIKit[K] =>
      ((props: object) => {
        store.push(props);
        return createElement('i', { 'data-kit': name });
      }) as unknown as UIKit[K];
    const withNav = (child: ReactNode, onNavigate: (p: string) => void = () => undefined, breadcrumbs?: { label: string }[]) =>
      createElement(NavigationProvider, { config: { items, activeKey: 'orders', onNavigate, breadcrumbs } }, child);

    it("Sidebar renders the kit's SidebarView with items, active key, collapsed state and a working onNavigate", () => {
      const seen: unknown[] = [];
      setUIKit({ SidebarView: capture('SidebarView', seen) });
      const navigated: string[] = [];
      const html = renderToStaticMarkup(withNav(createElement(Sidebar, { title: 'Acme' }), (p) => navigated.push(p)));
      expect(html).toContain('data-kit="SidebarView"');
      const props = seen[0] as {
        items: unknown[];
        activeKey: string;
        collapsed: boolean;
        isMobile: boolean;
        title: string;
        onNavigate: (p: string) => void;
        onToggleCollapsed: () => void;
        onClose: () => void;
      };
      expect(props.items).toHaveLength(2);
      expect(props.activeKey).toBe('orders');
      // Server rendering has no media query, so useIsMobile() is true there and the provider starts collapsed (drawer closed).
      expect(props.collapsed).toBe(props.isMobile);
      expect(props.title).toBe('Acme');
      props.onNavigate('/orders');
      expect(navigated).toEqual(['/orders']);
      expect(typeof props.onToggleCollapsed).toBe('function');
      expect(typeof props.onClose).toBe('function');
    });

    it("AppShell renders the kit's AppShellView; the mobile page title is the last crumb, else the active item's label", () => {
      const seen: unknown[] = [];
      setUIKit({ AppShellView: capture('AppShellView', seen) });
      const shell = (crumbs?: { label: string }[]) =>
        renderToStaticMarkup(withNav(createElement(AppShell, { sidebar: 'SB', header: 'HDR', actions: 'ACT' }, 'BODY'), undefined, crumbs));
      expect(shell([{ label: 'Home' }, { label: 'Order 42' }])).toContain('data-kit="AppShellView"');
      expect(shell()).toContain('data-kit="AppShellView"');
      const [withCrumbs, withoutCrumbs] = seen as { pageTitle: string; menuOpen: boolean; sidebar: string; header: string; actions: string; children: string }[];
      expect(withCrumbs!.pageTitle).toBe('Order 42');
      expect(withoutCrumbs!.pageTitle).toBe('Orders'); // falls back to the active nav item
      expect(withCrumbs!.menuOpen).toBe(false); // drawer starts closed on mobile / during server render (collapsed)
      expect([withCrumbs!.sidebar, withCrumbs!.header, withCrumbs!.actions, withCrumbs!.children]).toEqual(['SB', 'HDR', 'ACT', 'BODY']);
    });
  });

  it("renders KpiGrid's cards with the kit's KpiCard", () => {
    setUIKit({ KpiCard: marker('kpi') as UIKit['KpiCard'] });
    const html = renderToStaticMarkup(createElement(KpiGrid, { kpis: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }, { label: 'C', value: 3 }] }));
    expect((html.match(/data-kit="kpi"/g) ?? []).length).toBe(3);
  });
});
