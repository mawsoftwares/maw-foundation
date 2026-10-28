# Page template engine (`@mawsoftwares/page-templates`)

Third of the three independent systems: **layout** (app frame) · **theme** (look) · **page templates** (page structure).
Pure data + logic here; React rendering in `@mawsoftwares/ui-web` (`PageTemplate`, kit-swappable via Grid/Stack/Widget/ErrorState).
Depends only on `@mawsoftwares/layout`, and only for its generic versioned-config helpers.

Templates: `dashboard`, `listing`, `details` (also the safe fallback), `form`, `kanban`, `calendar`, `communication`.

```tsx
const registry = createPageTemplateRegistry({ widgets: ['revenue', 'orders-chart'] }); // approved widget ids
const template = resolvePageTemplate(storedPageConfig, registry);                       // never throws

<PageTemplate
  template={template}
  slots={{ header: <Title/>, content: <OrdersTable/> }}          // business content, unchanged under any template
  widgets={{ revenue: { title: 'Revenue', render: () => <RevenueKpi/>, permission: 'Read_Billing' } }}
  can={can}                                                      // from useDynamicAccess(); omitted = permissioned widgets hidden
/>
```

- **Stored page config:** `{ version, templateId, settings?: { width, aside, columns }, widgets?: [{ slot, widget, span?, title? }] }`.
- **Widget slots:** config names approved widget ids only; the renderer, data access and RBAC `permission` live in app code. Unknown/ungranted widgets are skipped, never an error. ≤24 placements, titles ≤80 chars, rendered as text.
- **Required slots:** a page missing one renders an error state instead of crashing (`missingRequiredSlots`).
- **Fallback:** missing/invalid/newer config or unknown template → `details`, with `issues`.
- **New template:** `registry.registerTemplate({ id, label, description, slots, widgetSlots, defaults })`; an unknown id renders its slots stacked in declared order, so no core change is needed for a basic template.
- **Responsive:** widget grid steps down 4→3→2→1 columns; side column stacks below `lg`; communication shows one pane (`activePane`) on small screens; kanban lanes scroll in a focusable region.
- **Try it:** `pnpm --filter @mawsoftwares/ui-web-tailwind dev`, `/?kit=tailwind&page=dashboard#shell` (also `layout=` to combine with a layout preset).

Not in this phase: persisting page configs (Phase 7), drag-and-drop widget arrangement in the Studio (Phase 5), and the kanban/calendar/chat *content* components — templates provide the frame, modules supply the lanes, calendar and threads.
