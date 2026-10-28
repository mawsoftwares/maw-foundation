import { PRESET_ID_PATTERN } from '@mawsoftwares/layout';
import { BUILT_IN_PAGE_TEMPLATES } from './templates';
import type { PageTemplateDefinition } from './types';

/** Used when a page's stored config is unusable: the most generic frame (header + content + optional side column). */
export const DEFAULT_PAGE_TEMPLATE_ID = 'details';

export interface PageTemplateRegistry {
  readonly fallbackTemplateId: string;
  registerTemplate(template: PageTemplateDefinition): void;
  /** Approve a widget id so configs may place it. The app supplies the renderer for it. */
  registerWidget(id: string): void;
  getTemplate(id: string): PageTemplateDefinition | undefined;
  listTemplates(): readonly PageTemplateDefinition[];
  widgetIds(): ReadonlySet<string>;
}

export interface CreatePageTemplateRegistryOptions {
  readonly templates?: readonly PageTemplateDefinition[];
  readonly widgets?: readonly string[];
  readonly fallbackTemplateId?: string;
}

/** Developer-time registration: malformed or duplicate templates throw immediately. */
export function createPageTemplateRegistry(options: CreatePageTemplateRegistryOptions = {}): PageTemplateRegistry {
  const templates = new Map<string, PageTemplateDefinition>();
  const widgets = new Set<string>(options.widgets ?? []);

  const registry: PageTemplateRegistry = {
    fallbackTemplateId: options.fallbackTemplateId ?? DEFAULT_PAGE_TEMPLATE_ID,
    registerWidget: (id) => void widgets.add(id),
    registerTemplate(t) {
      if (!PRESET_ID_PATTERN.test(t.id)) throw new Error(`Invalid page template id "${t.id}".`);
      if (templates.has(t.id)) throw new Error(`Page template "${t.id}" is already registered.`);
      const slotIds = new Set(t.slots.map((s) => s.id));
      if (slotIds.size !== t.slots.length) throw new Error(`Page template "${t.id}" has duplicate slot ids.`);
      for (const w of t.widgetSlots) {
        if (!slotIds.has(w)) throw new Error(`Page template "${t.id}": widget slot "${w}" is not a slot.`);
      }
      templates.set(t.id, t);
    },
    getTemplate: (id) => templates.get(id),
    listTemplates: () => [...templates.values()],
    widgetIds: () => widgets,
  };

  for (const t of options.templates ?? BUILT_IN_PAGE_TEMPLATES) registry.registerTemplate(t);
  return registry;
}

/** Built-in templates, no widgets approved yet — apps call `registerWidget` for theirs. */
export const defaultPageTemplateRegistry = createPageTemplateRegistry();
