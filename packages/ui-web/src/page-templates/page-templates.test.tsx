import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createPageTemplateRegistry, resolvePageTemplate } from '@mawsoftwares/page-templates';
import { PageTemplate, type PageSlots } from './PageTemplate';
import { buildWidgetCells, type WidgetRegistry } from './widgets';

const registry = createPageTemplateRegistry({ widgets: ['revenue', 'orders', 'secret'] });
const widgets: WidgetRegistry = {
  revenue: { title: 'Revenue', render: () => 'REVENUE-NODE' },
  orders: { title: 'Orders', render: () => 'ORDERS-NODE', span: 2 },
  secret: { title: 'Secret', render: () => 'SECRET-NODE', permission: 'Read_Secret' },
};
const resolve = (config: unknown) => resolvePageTemplate(config, registry);
const render = (config: unknown, slots: PageSlots, extra: { can?: (p: string) => boolean; isCompact?: boolean; activePane?: 'list' | 'thread' | 'details' } = {}): string =>
  renderToStaticMarkup(createElement(PageTemplate, { template: resolve(config), slots, widgets, ...extra }) as ReactNode as never);

describe('buildWidgetCells', () => {
  const dash = resolve({
    version: 1,
    templateId: 'dashboard',
    settings: { columns: 2 },
    widgets: [
      { slot: 'widgets', widget: 'orders', span: 4, title: 'Custom title' },
      { slot: 'widgets', widget: 'revenue' },
      { slot: 'widgets', widget: 'secret' },
    ],
  });

  it('uses the placement title over the entry title and caps spans to the column count', () => {
    const cells = buildWidgetCells(dash, 'widgets', widgets, () => true);
    expect(cells.map((c) => [c.title, c.span])).toEqual([['Custom title', 2], ['Revenue', 1], ['Secret', 1]]);
  });

  it('hides permissioned widgets without permission, and when no `can` is supplied (fail closed)', () => {
    expect(buildWidgetCells(dash, 'widgets', widgets, () => false).map((c) => c.title)).toEqual(['Custom title', 'Revenue']);
    expect(buildWidgetCells(dash, 'widgets', widgets).map((c) => c.title)).toEqual(['Custom title', 'Revenue']);
  });

  it('skips ids the app has no renderer for', () => {
    expect(buildWidgetCells(dash, 'widgets', { revenue: widgets['revenue']! }, () => true)).toHaveLength(1);
    expect(buildWidgetCells(dash, 'kpis', widgets)).toEqual([]);
  });
});

describe('PageTemplate', () => {
  it('dashboard: header, KPI widgets unframed, widget grid framed with titles, free content', () => {
    const html = render(
      { version: 1, templateId: 'dashboard', widgets: [{ slot: 'kpis', widget: 'revenue' }, { slot: 'widgets', widget: 'orders' }] },
      { header: 'HEAD', content: 'FREE' },
    );
    for (const t of ['HEAD', 'REVENUE-NODE', 'ORDERS-NODE', 'Orders', 'FREE']) expect(html).toContain(t);
    expect(html).toContain('data-page-template="dashboard"');
    expect(html).not.toContain('>Revenue<');
  });

  it('listing: filters, toolbar and content in order', () => {
    const html = render({ version: 1, templateId: 'listing' }, { filters: 'FILTERS-X', toolbar: 'TOOLBAR-X', content: 'CONTENT-X' });
    expect(html.indexOf('FILTERS-X')).toBeGreaterThan(-1);
    expect(html.indexOf('FILTERS-X')).toBeLessThan(html.indexOf('TOOLBAR-X'));
    expect(html.indexOf('TOOLBAR-X')).toBeLessThan(html.indexOf('CONTENT-X'));
  });

  it('details: side column only when the setting is on', () => {
    const slots = { content: 'MAIN', aside: 'SIDE' };
    expect(render({ version: 1, templateId: 'details' }, slots)).toContain('SIDE');
    expect(render({ version: 1, templateId: 'details', settings: { aside: false } }, slots)).not.toContain('SIDE');
  });

  it('form: sticky action footer; kanban: focusable scroll region; calendar: toolbar + calendar + agenda', () => {
    expect(render({ version: 1, templateId: 'form' }, { content: 'FORM', footer: 'ACTIONS' })).toContain('position:sticky');
    const kanban = render({ version: 1, templateId: 'kanban' }, { board: 'LANES' });
    expect(kanban).toContain('aria-label="Board"');
    expect(kanban).toContain('tabindex="0"');
    const cal = render({ version: 1, templateId: 'calendar' }, { toolbar: 'TB', calendar: 'CAL', aside: 'AGENDA' });
    for (const t of ['TB', 'CAL', 'AGENDA']) expect(cal).toContain(t);
  });

  it('communication: three panes on wide screens, one pane when compact', () => {
    const slots = { list: 'LIST', thread: 'THREAD', details: 'DETAILS' };
    const wide = render({ version: 1, templateId: 'communication' }, slots, { isCompact: false });
    for (const t of ['LIST', 'THREAD', 'DETAILS']) expect(wide).toContain(t);
    const compact = render({ version: 1, templateId: 'communication' }, slots, { isCompact: true, activePane: 'thread' });
    expect(compact).toContain('THREAD');
    expect(compact).not.toContain('LIST');
    expect(compact).not.toContain('DETAILS');
  });

  it('ignores slots the template does not declare (communication has no header)', () => {
    const html = render({ version: 1, templateId: 'communication' }, { header: 'NOPE-HEADER', list: 'L1', thread: 'T1' }, { isCompact: false });
    expect(html).not.toContain('NOPE-HEADER');
  });

  it('shows an error state instead of crashing when a required slot is missing', () => {
    const html = render({ version: 1, templateId: 'listing' }, { header: 'H' });
    expect(html).toContain('Missing content for: content');
  });

  it('falls back to the generic details template for a bad config and still renders content', () => {
    const html = render({ version: 1, templateId: 'nope' }, { content: 'STILL-HERE' });
    expect(html).toContain('STILL-HERE');
    expect(html).toContain('data-page-template="details"');
  });
});
