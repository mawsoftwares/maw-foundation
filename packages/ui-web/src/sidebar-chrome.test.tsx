import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NavigationProvider } from './navigation';
import { SidebarBrand, SidebarUser } from './sidebar-chrome';

const nav = { items: [], activeKey: '', onNavigate: () => undefined };
const user = (collapsed: boolean): string =>
  renderToStaticMarkup(createElement(NavigationProvider, { config: nav }, createElement(SidebarUser, { collapsed, name: 'u-owner', role: 'super_admin' })));

describe('SidebarBrand', () => {
  it('shows the product name and subtitle, and only the logo tile when collapsed', () => {
    const open = renderToStaticMarkup(createElement(SidebarBrand, { collapsed: false, title: 'MAW Foundation', subtitle: 'Admin Console' }));
    expect(open).toContain('MAW Foundation');
    expect(open).toContain('Admin Console');
    const rail = renderToStaticMarkup(createElement(SidebarBrand, { collapsed: true, title: 'MAW Foundation', subtitle: 'Admin Console' }));
    expect(rail).not.toContain('Admin Console');
    expect(rail).toContain('title="MAW Foundation"');
  });
});

describe('SidebarUser', () => {
  it('shows the name, a readable role and the online dot; the rail shows only the avatar', () => {
    const open = user(false);
    expect(open).toContain('u-owner');
    expect(open).toContain('Super Admin');
    expect(open).toContain('maw-live-pulse');
    expect(open).toContain('aria-haspopup="menu"');
    expect(user(true)).not.toContain('Super Admin');
  });
});
