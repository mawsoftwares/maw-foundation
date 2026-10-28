import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_PAGE_TEMPLATES,
  DEFAULT_PAGE_TEMPLATE_ID,
  createPageTemplateRegistry,
  defaultPageTemplateRegistry,
  detailsTemplate,
  missingRequiredSlots,
  resolvePageTemplate,
  validateStoredPageConfig,
  validateWidgetPlacements,
  type PageTemplateDefinition,
} from '../index';

const registry = () => createPageTemplateRegistry({ widgets: ['revenue-kpi', 'orders-chart', 'activity-feed'] });

describe('registry', () => {
  it('ships the seven templates required by the spec', () => {
    expect(defaultPageTemplateRegistry.listTemplates().map((t) => t.id)).toEqual([
      'dashboard', 'listing', 'details', 'form', 'kanban', 'calendar', 'communication',
    ]);
    expect(defaultPageTemplateRegistry.fallbackTemplateId).toBe(DEFAULT_PAGE_TEMPLATE_ID);
  });

  it('every built-in widget slot is a real slot', () => {
    for (const t of BUILT_IN_PAGE_TEMPLATES) for (const w of t.widgetSlots) expect(t.slots.map((s) => s.id)).toContain(w);
  });

  it('accepts new templates and rejects duplicates, bad ids and bad widget slots', () => {
    const r = registry();
    const custom: PageTemplateDefinition = { ...detailsTemplate, id: 'wizard', label: 'Wizard' };
    r.registerTemplate(custom);
    expect(r.getTemplate('wizard')).toBe(custom);
    expect(() => r.registerTemplate(custom)).toThrow(/already registered/);
    expect(() => r.registerTemplate({ ...custom, id: 'Bad Id' })).toThrow(/Invalid page template id/);
    expect(() => r.registerTemplate({ ...custom, id: 'x', widgetSlots: ['nope'] })).toThrow(/not a slot/);
    expect(() => r.registerTemplate({ ...custom, id: 'y', slots: [...custom.slots, custom.slots[0]!] })).toThrow(/duplicate slot/);
  });
});

describe('validation', () => {
  const dash = defaultPageTemplateRegistry.getTemplate('dashboard')!;
  const approved = new Set(['revenue-kpi']);

  it('accepts approved widgets in widget slots', () => {
    expect(validateWidgetPlacements([{ slot: 'kpis', widget: 'revenue-kpi', span: 2, title: 'Revenue' }], dash, approved).ok).toBe(true);
  });

  it('rejects unapproved widgets, non-widget slots, bad spans, unknown keys and long titles', () => {
    const r = validateWidgetPlacements(
      [
        { slot: 'kpis', widget: 'evil' },
        { slot: 'header', widget: 'revenue-kpi' },
        { slot: 'kpis', widget: 'revenue-kpi', span: 9 },
        { slot: 'kpis', widget: 'revenue-kpi', onClick: 'x' },
        { slot: 'kpis', widget: 'revenue-kpi', title: 'x'.repeat(81) },
      ],
      dash,
      approved,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.map((i) => i.path)).toEqual(
      expect.arrayContaining(['widgets[0].widget', 'widgets[1].slot', 'widgets[2].span', 'widgets[3].onClick', 'widgets[4].title']),
    );
  });

  it('caps the number of placements', () => {
    const many = Array.from({ length: 25 }, () => ({ slot: 'kpis', widget: 'revenue-kpi' }));
    expect(validateWidgetPlacements(many, dash, approved).ok).toBe(false);
  });

  it('validates the stored envelope and settings', () => {
    expect(validateStoredPageConfig({ version: 1, templateId: 'dashboard', settings: { columns: 2 } }).ok).toBe(true);
    expect(validateStoredPageConfig({ version: 1, templateId: 'dashboard', settings: { columns: 7 } }).ok).toBe(false);
    expect(validateStoredPageConfig({ version: 1, templateId: 'dashboard', settings: { css: 'x' } }).ok).toBe(false);
    expect(validateStoredPageConfig({ version: 1, templateId: '../x' }).ok).toBe(false);
    expect(validateStoredPageConfig({ version: 1, templateId: 'a', extra: 1 }).ok).toBe(false);
  });

  it('reports required slots a page did not supply', () => {
    const comm = defaultPageTemplateRegistry.getTemplate('communication')!;
    expect(missingRequiredSlots(comm, ['list'])).toEqual(['thread']);
    expect(missingRequiredSlots(comm, ['list', 'thread'])).toEqual([]);
  });
});

describe('resolvePageTemplate', () => {
  it('defaults to the fallback template when nothing is stored', () => {
    const r = resolvePageTemplate(null);
    expect(r.templateId).toBe('details');
    expect(r.source).toBe('default');
  });

  it('applies template defaults, settings and grouped placements in order', () => {
    const r = resolvePageTemplate(
      {
        version: 1,
        templateId: 'dashboard',
        settings: { columns: 2 },
        widgets: [
          { slot: 'widgets', widget: 'orders-chart', span: 2 },
          { slot: 'kpis', widget: 'revenue-kpi' },
          { slot: 'widgets', widget: 'activity-feed' },
        ],
      },
      registry(),
    );
    expect(r.source).toBe('config');
    expect(r.settings).toEqual({ width: 'contained', aside: false, columns: 2 });
    expect(r.placements['widgets']?.map((w) => w.widget)).toEqual(['orders-chart', 'activity-feed']);
    expect(r.placements['kpis']).toHaveLength(1);
  });

  it('falls back safely for unknown templates, bad widgets, newer versions and junk', () => {
    const cases: unknown[] = [
      { version: 1, templateId: 'removed' },
      { version: 1, templateId: 'dashboard', widgets: [{ slot: 'kpis', widget: 'not-approved' }] },
      { version: 99, templateId: 'dashboard' },
      'garbage',
      7,
      [],
    ];
    for (const input of cases) {
      const r = resolvePageTemplate(input, registry());
      expect(r.templateId).toBe('details');
      expect(r.source).toBe('fallback');
      expect(r.issues.length).toBeGreaterThan(0);
    }
  });

  it('throws only when the registry lacks its fallback', () => {
    expect(() => resolvePageTemplate(null, createPageTemplateRegistry({ templates: [] }))).toThrow(/Fallback page template/);
  });
});
