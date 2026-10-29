import { migrateLayoutConfig, type MigrateOptions } from '@mawsoftwares/layout';
import { defaultPageTemplateRegistry, type PageTemplateRegistry } from './registry';
import type { PageTemplateDefinition, PageTemplateIssue, ResolvedPageTemplate, WidgetPlacement } from './types';
import { validateStoredPageConfig, validateWidgetPlacements } from './validate';

function fromTemplate(
  t: PageTemplateDefinition,
  source: ResolvedPageTemplate['source'],
  issues: readonly PageTemplateIssue[],
  settings = t.defaults,
  widgets: readonly WidgetPlacement[] = [],
): ResolvedPageTemplate {
  const placements: Record<string, WidgetPlacement[]> = {};
  for (const w of widgets) (placements[w.slot] ??= []).push(w);
  return { templateId: t.id, label: t.label, slots: t.slots, widgetSlots: t.widgetSlots, settings, placements, source, issues };
}

/**
 * Turn a page's stored config into something always renderable. Never throws (except a registry with no fallback):
 * nothing stored → the fallback template; unusable/unknown/newer config → fallback with `issues`; valid → template
 * defaults + settings + widget placements. Versioning reuses the layout engine's generic migration chain.
 */
export function resolvePageTemplate(
  stored: unknown,
  registry: PageTemplateRegistry = defaultPageTemplateRegistry,
  migrate: MigrateOptions = {},
): ResolvedPageTemplate {
  const fallback = registry.getTemplate(registry.fallbackTemplateId);
  if (fallback === undefined) throw new Error(`Fallback page template "${registry.fallbackTemplateId}" is not registered.`);
  if (stored === null || stored === undefined) return fromTemplate(fallback, 'default', []);

  const migrated = migrateLayoutConfig(stored, migrate);
  if (!migrated.ok) return fromTemplate(fallback, 'fallback', migrated.issues);
  const envelope = validateStoredPageConfig(migrated.value);
  if (!envelope.ok) return fromTemplate(fallback, 'fallback', envelope.issues);

  const config = envelope.value;
  const template = registry.getTemplate(config.templateId);
  if (template === undefined) {
    return fromTemplate(fallback, 'fallback', [{ path: 'templateId', message: `Page template "${config.templateId}" is not available.` }]);
  }
  let widgets: readonly WidgetPlacement[] = [];
  if (config.widgets !== undefined) {
    const r = validateWidgetPlacements(config.widgets, template, registry.widgetIds());
    if (!r.ok) return fromTemplate(fallback, 'fallback', r.issues);
    widgets = r.value;
  }
  return fromTemplate(template, 'config', [], { ...template.defaults, ...config.settings }, widgets);
}
