import type { ReactNode } from 'react';
import { missingRequiredSlots, type ResolvedPageTemplate } from '@mawsoftwares/page-templates';
import { Widget } from '../dashboard';
import { useIsMobile } from '../responsive';
import { ErrorState, Grid, Stack } from '../kit';
import { buildWidgetCells, type WidgetCell, type WidgetRegistry } from './widgets';

export type PageSlots = Readonly<Partial<Record<string, ReactNode>>>;
export type CommunicationPane = 'list' | 'thread' | 'details';

export interface PageTemplateProps {
  /** From `resolvePageTemplate`. */
  readonly template: ResolvedPageTemplate;
  /** Business content, keyed by the template's slot ids. The template never inspects it. */
  readonly slots: PageSlots;
  /** Renderers for the widget ids the config may place. */
  readonly widgets?: WidgetRegistry;
  /** Permission check for widgets with a `permission`. Omitted = permissioned widgets are hidden. */
  readonly can?: (permission: string) => boolean;
  /** Communication template on small screens: which single pane is shown. Default `list`. */
  readonly activePane?: CommunicationPane;
  /** Force the single-pane communication view. Default: follows the mobile breakpoint. */
  readonly isCompact?: boolean;
}

const has = (n: ReactNode): boolean => n !== undefined && n !== null && n !== false;
const GAP = 'var(--maw-space-lg)';
const ASIDE_COLUMNS = { xs: '1fr', lg: 'minmax(0, 1fr) 20rem' } as const;

function columnsFor(count: number): { xs: number; sm: number; lg: number; xl: number } {
  return { xs: 1, sm: Math.min(2, count), lg: Math.min(3, count), xl: count };
}

function Cells({ cells, framed, columns }: { cells: readonly WidgetCell[]; framed: boolean; columns: number }): ReactNode {
  if (cells.length === 0) return null;
  return (
    <Grid columns={columnsFor(columns)} gap={GAP}>
      {cells.map((c) =>
        framed ? (
          <Widget key={c.key} title={c.title} span={{ xs: 1, lg: c.span }} height={c.height}>
            {c.node}
          </Widget>
        ) : (
          <div key={c.key} style={{ gridColumn: `span ${c.span}`, minWidth: 0 }}>
            {c.node}
          </div>
        ),
      )}
    </Grid>
  );
}

/** Main column plus an optional side column; one column on small screens. */
function WithAside({ main, aside }: { main: ReactNode; aside: ReactNode }): ReactNode {
  if (!has(aside)) return <>{main}</>;
  return (
    <Grid columns={ASIDE_COLUMNS} gap={GAP}>
      <div style={{ minWidth: 0 }}>{main}</div>
      <Stack direction="column" gap={GAP}>
        {aside}
      </Stack>
    </Grid>
  );
}

/**
 * Renders a resolved page template around business content. Structure only: slots are filled by the page, widget
 * placements come from config but render through the app's `widgets` registry, styling comes from the theme tokens
 * via the active UI kit. Works under every application layout.
 */
export function PageTemplate({ template, slots, widgets = {}, can, activePane = 'list', isCompact }: PageTemplateProps): ReactNode {
  const mobile = useIsMobile();
  const compact = isCompact ?? mobile;
  const supplied = Object.keys(slots).filter((id) => has(slots[id]));
  const missing = missingRequiredSlots(template, supplied);
  if (missing.length > 0) {
    return <ErrorState title="This page isn't set up correctly" message={`Missing content for: ${missing.join(', ')}.`} />;
  }

  const { settings } = template;
  const cells = (slot: string): WidgetCell[] => buildWidgetCells(template, slot, widgets, can);
  const asideNodes = (): ReactNode => {
    if (!settings.aside) return undefined;
    const widgetCells = cells('aside');
    if (!has(slots['aside']) && widgetCells.length === 0) return undefined;
    return (
      <>
        {slots['aside']}
        <Cells cells={widgetCells} framed columns={1} />
      </>
    );
  };

  let body: ReactNode;
  switch (template.templateId) {
    case 'dashboard':
      body = (
        <WithAside
          main={
            <Stack direction="column" gap={GAP}>
              <Cells cells={cells('kpis')} framed={false} columns={settings.columns} />
              <Cells cells={cells('widgets')} framed columns={settings.columns} />
              {slots['content']}
            </Stack>
          }
          aside={asideNodes()}
        />
      );
      break;
    case 'details':
      body = <WithAside main={<Stack direction="column" gap={GAP}>{slots['summary']}{slots['content']}</Stack>} aside={asideNodes()} />;
      break;
    case 'calendar':
      body = <WithAside main={<Stack direction="column" gap={GAP}>{slots['toolbar']}{slots['calendar']}</Stack>} aside={asideNodes()} />;
      break;
    case 'form':
      body = (
        <div style={{ maxWidth: settings.width === 'full' ? 'none' : '48rem', margin: '0 auto' }}>
          <Stack direction="column" gap={GAP}>{slots['content']}</Stack>
          {has(slots['footer']) && (
            <div
              style={{
                position: 'sticky',
                bottom: 0,
                marginTop: GAP,
                padding: 'var(--maw-space-md) 0',
                background: 'var(--maw-canvas)',
                borderTop: '1px solid var(--maw-border)',
              }}
            >
              {slots['footer']}
            </div>
          )}
        </div>
      );
      break;
    case 'kanban':
      body = (
        <Stack direction="column" gap={GAP}>
          {slots['toolbar']}
          <div role="region" aria-label="Board" tabIndex={0} style={{ overflowX: 'auto', paddingBottom: 'var(--maw-space-sm)' }}>
            {slots['board']}
          </div>
        </Stack>
      );
      break;
    case 'communication': {
      const showDetails = settings.aside && has(slots['details']);
      const pane = (id: CommunicationPane, label: string): ReactNode => (
        <section aria-label={label} style={{ minWidth: 0, minHeight: 0, overflowY: 'auto' }}>
          {slots[id]}
        </section>
      );
      body = compact ? (
        pane(activePane === 'details' && !showDetails ? 'thread' : activePane, 'Messages')
      ) : (
        <Grid columns={showDetails ? '20rem minmax(0, 1fr) 18rem' : '20rem minmax(0, 1fr)'} gap={GAP}>
          {pane('list', 'Conversations')}
          {pane('thread', 'Thread')}
          {showDetails && pane('details', 'Details')}
        </Grid>
      );
      break;
    }
    case 'listing':
      body = (
        <Stack direction="column" gap={GAP}>
          {slots['filters']}
          {slots['toolbar']}
          {slots['content']}
        </Stack>
      );
      break;
    default:
      // A template registered by the app: stack its slots in declared order.
      body = (
        <Stack direction="column" gap={GAP}>
          {template.slots.filter((s) => s.id !== 'header').map((s) => <div key={s.id}>{slots[s.id]}</div>)}
        </Stack>
      );
  }

  return (
    <div data-page-template={template.templateId} style={{ width: '100%', maxWidth: settings.width === 'full' ? 'none' : undefined }}>
      <Stack direction="column" gap={GAP}>
        {has(slots['header']) && template.slots.some((x) => x.id === 'header') && <header>{slots['header']}</header>}
        {body}
      </Stack>
    </div>
  );
}
