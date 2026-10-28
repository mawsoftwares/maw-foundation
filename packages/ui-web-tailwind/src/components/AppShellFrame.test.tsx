import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AppShellViewProps, ShellFrame } from '@mawsoftwares/ui-contract';
import { AppShellView } from './AppShellView';
import { SidebarView } from './SidebarView';

const noop = (): void => undefined;
const props: AppShellViewProps = {
  sidebar: createElement('aside', { 'aria-label': 'nav' }, 'SIDEBAR'),
  header: 'HEADER',
  actions: 'ACTIONS',
  children: 'CONTENT',
  isMobile: false,
  menuOpen: false,
  onMenuToggle: noop,
  onMenuClose: noop,
  pageTitle: 'Orders',
};
const frame = (patch: Partial<ShellFrame> = {}): ShellFrame => ({
  density: 'comfortable',
  sidebar: { position: 'left', variant: 'docked' },
  header: { enabled: true, variant: 'default', sticky: true },
  footer: true,
  contentWidth: 'contained',
  shape: { frame: 'full-bleed', corners: 'soft', nav: 'rounded', indicator: 'fill' },
  motion: { page: 'none' },
  ...patch,
});
const render = (p: Partial<AppShellViewProps> = {}): string => renderToStaticMarkup(createElement(AppShellView, { ...props, ...p }));

describe('AppShellView frame', () => {
  it('without a frame renders the classic shell: no skip link, footer present, same business content', () => {
    const html = render();
    expect(html).not.toContain('Skip to content');
    expect(html).toContain('Powered by');
    for (const t of ['SIDEBAR', 'HEADER', 'ACTIONS', 'CONTENT']) expect(html).toContain(t);
  });

  it('a classic frame keeps the same regions and adds a keyboard skip link to the main landmark', () => {
    const html = render({ frame: frame() });
    expect(html).toContain('href="#maw-main"');
    expect(html).toContain('id="maw-main"');
    expect(html).toContain('<main');
    expect(html).toContain('Powered by');
  });

  it('floating sidebar wraps the sidebar in an inset card', () => {
    const html = render({ frame: frame({ sidebar: { position: 'left', variant: 'floating' } }) });
    expect(html).toContain('[&amp;&gt;aside]:rounded-[var(--maw-shell-radius,12px)]');
    expect(html).toContain('SIDEBAR');
  });

  it('right-positioned sidebar reverses the row', () => {
    expect(render({ frame: frame({ sidebar: { position: 'right', variant: 'docked' } }) })).toContain('flex-row-reverse');
  });

  it('honours header disabled / not sticky, footer off, full-width content, density', () => {
    expect(render({ frame: frame({ header: { enabled: false, variant: 'default', sticky: true } }) })).not.toContain('<header');
    expect(render({ frame: frame({ header: { enabled: true, variant: 'default', sticky: false } }) })).toContain('relative');
    expect(render({ frame: frame({ footer: false }) })).not.toContain('Powered by');
    expect(render({ frame: frame({ contentWidth: 'full' }) })).toContain('max-w-none');
    expect(render({ frame: frame({ density: 'compact' }) })).toContain('data-layout-density="compact"');
  });

  it('renders an open right panel as a labelled complementary region with an accessible toggle', () => {
    const html = render({
      frame: frame({ rightPanel: { content: 'PANEL', label: 'Filters', width: 'md', collapsible: true, defaultOpen: true } }),
    });
    expect(html).toContain('PANEL');
    expect(html).toContain('aria-label="Filters"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-label="Hide Filters"');
  });

  it('a closed right panel keeps the toggle but not the content', () => {
    const html = render({
      frame: frame({ rightPanel: { content: 'PANEL', label: 'Filters', width: 'md', collapsible: true, defaultOpen: false } }),
    });
    expect(html).not.toContain('PANEL');
    expect(html).toContain('aria-expanded="false"');
  });

  it('on mobile the sidebar leaves the page flow, the menu button shows and the right panel is dropped', () => {
    const html = render({
      isMobile: true,
      frame: frame({ rightPanel: { content: 'PANEL', label: 'Filters', width: 'md', collapsible: true, defaultOpen: true } }),
    });
    expect(html).toContain('aria-label="Menu"');
    expect(html).toContain('Orders');
    expect(html).not.toContain('PANEL');
    expect(html).not.toContain('Powered by');
  });
});

describe('mobile bottom navigation', () => {
  it('renders below the content on mobile only', () => {
    const html = render({ isMobile: true, frame: frame({ mobileNav: 'BOTTOM-NAV' }) });
    expect(html).toContain('BOTTOM-NAV');
    expect(html.indexOf('CONTENT')).toBeLessThan(html.indexOf('BOTTOM-NAV'));
    expect(render({ isMobile: false, frame: frame({ mobileNav: 'BOTTOM-NAV' }) })).not.toContain('BOTTOM-NAV');
  });
});

describe('SidebarView collapsible', () => {
  const view = (collapsible?: boolean, collapsed = false): string =>
    renderToStaticMarkup(
      createElement(SidebarView, {
        items: [{ key: 'a', label: 'A', path: '/a' }], activeKey: 'a', collapsed, isMobile: false,
        onNavigate: noop, onToggleCollapsed: noop, onClose: noop, ...(collapsible === undefined ? {} : { collapsible }),
      }),
    );

  it('shows the collapse button by default and hides it when not collapsible', () => {
    expect(view()).toContain('aria-label="Collapse"');
    expect(view(false)).not.toContain('aria-label="Collapse"');
    expect(view(false, true)).not.toContain('aria-label="Expand"');
  });
});

describe('shape', () => {
  it('inset frame draws a rounded card on a tinted canvas on desktop, and is full-bleed on mobile', () => {
    const desktop = render({ frame: frame({ shape: { frame: 'inset', corners: 'round', nav: 'rounded', indicator: 'fill' } }) });
    expect(desktop).toContain('rounded-[var(--maw-shell-radius)]');
    expect(desktop).toContain('--maw-shell-radius:24px');
    const mobile = render({ isMobile: true, frame: frame({ shape: { frame: 'inset', corners: 'round', nav: 'rounded', indicator: 'fill' } }) });
    expect(mobile).not.toContain('rounded-[var(--maw-shell-radius)]');
  });

  it('corners map to radii; pill navigation sets the nav item radius; rounded leaves the theme alone', () => {
    expect(render({ frame: frame({ shape: { frame: 'full-bleed', corners: 'sharp', nav: 'rounded', indicator: 'fill' } }) })).toContain('--maw-shell-radius:0px');
    const pill = render({ frame: frame({ shape: { frame: 'full-bleed', corners: 'soft', nav: 'pill', indicator: 'fill' } }) });
    expect(pill).toContain('--maw-comp-nav-item-border-radius:9999px');
    expect(pill).toContain('--maw-comp-nav-item-active-border-radius:9999px');
    expect(render({ frame: frame() })).not.toContain('--maw-comp-nav-item-border-radius');
  });

  it('without a frame there are no shape variables at all (classic shell untouched)', () => {
    expect(render()).not.toContain('--maw-shell-radius');
  });

  it('header, sidebar logo and shell height read their theme tokens with the old tokens as fallbacks', () => {
    const html = render();
    expect(html).toContain('--maw-shell-header-bg,var(--maw-shell-bg,var(--maw-surface))');
    expect(html).toContain('h-[var(--maw-shell-height,100vh)]');
  });
});

describe('page entrance motion', () => {
  it('fade and rise animate the content wrapper (with reduced-motion off); none adds nothing', () => {
    expect(render({ frame: frame({ motion: { page: 'fade' } }) })).toContain('animate-page-fade motion-reduce:animate-none');
    expect(render({ frame: frame({ motion: { page: 'rise' } }) })).toContain('animate-page-rise motion-reduce:animate-none');
    expect(render({ frame: frame() })).not.toContain('animate-page');
  });
});
