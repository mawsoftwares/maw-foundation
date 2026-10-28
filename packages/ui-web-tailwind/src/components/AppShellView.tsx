import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import type { AppShellViewProps, ShellFrame } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';
import { Drawer } from './Drawer';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

// ui-web's desktop footer carries this vendor mark; kept as-is so switching kits does not change the product's branding.
const BRAND_BLUE = '#2b7ec2';
const BRAND_ORANGE = '#f16d22';

function PoweredBy(): ReactNode {
  return (
    <footer className="box-border flex shrink-0 items-center justify-center gap-2 border-t border-border bg-[var(--maw-surface)] px-[var(--maw-space-xl)] py-[var(--maw-space-lg)] font-sans text-sm text-fg-muted">
      Powered by
      <div className="flex items-center gap-1 font-sans font-extrabold tracking-[0.02em]">
        <span className="text-base" style={{ color: BRAND_BLUE }}>
          MINDS
        </span>
        <span
          className="flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: BRAND_ORANGE }}
        >
          AT
        </span>
        <span className="text-base" style={{ color: BRAND_BLUE }}>
          WORK
        </span>
      </div>
    </footer>
  );
}

/** Corner radius of the app card / floating sidebar for each `corners` setting. */
const CORNER_RADIUS = { sharp: '0px', soft: '12px', round: '24px' } as const;

const PANEL_WIDTH = { sm: 'w-64', md: 'w-80', lg: 'w-96' } as const;

const CONTENT_PADDING = {
  compact: 'p-[var(--maw-space-md)]',
  comfortable: 'p-[var(--maw-space-container-padding,var(--maw-space-xl))]',
  spacious: 'p-[calc(var(--maw-space-container-padding,var(--maw-space-xl))*1.5)]',
} as const;

type Panel = NonNullable<ShellFrame['rightPanel']>;

/** Collapsible right-hand panel. Local open/closed state; keyboard reachable, with the toggle announcing its state. */
function RightPanel({ panel }: { panel: Panel }): ReactNode {
  const [open, setOpen] = useState(panel.defaultOpen || !panel.collapsible);
  const id = useId();
  return (
    <>
      {panel.collapsible && (
        <IconButton
          label={open ? `Hide ${panel.label}` : `Show ${panel.label}`}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="absolute right-2 top-2 z-10 text-[var(--maw-shell-fg-muted,var(--maw-fgMuted))]"
        >
          <Icon name={open ? 'chevron-right' : 'chevron-left'} size={16} />
        </IconButton>
      )}
      {open && (
        <aside
          id={id}
          aria-label={panel.label}
          className={cn(
            'box-border shrink-0 overflow-y-auto border-l border-border bg-[var(--maw-surface)] p-[var(--maw-space-lg)]',
            PANEL_WIDTH[panel.width],
          )}
        >
          {panel.content}
        </aside>
      )}
    </>
  );
}

/**
 * Same props as the `AppShellView` in @mawsoftwares/ui-web: sidebar + sticky header + scrolling content (+ desktop footer); on mobile the
 * sidebar sits in a left Drawer and the header shows a menu button and `pageTitle`. Uses the kit's own Drawer and IconButton.
 * With `frame` it also renders layout variants (floating sidebar, header styles, density, right panel); without it the output is the classic shell.
 */
export function AppShellView({
  sidebar,
  header,
  actions,
  children,
  isMobile,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  pageTitle,
  style,
  frame,
}: AppShellViewProps): ReactNode {
  const showHeader = (header !== undefined || actions !== undefined || isMobile) && (frame?.header.enabled ?? true);
  const floating = frame?.sidebar.variant === 'floating';
  const headerVariant = frame?.header.variant ?? 'default';
  const sticky = frame?.header.sticky ?? true;
  const panel = isMobile ? undefined : frame?.rightPanel;

  const main = (
    <main
      id="maw-main"
      tabIndex={-1}
      className={cn(
        'min-w-0 flex-1 overflow-y-auto overflow-x-hidden outline-none',
        isMobile ? 'p-[var(--maw-space-md)]' : CONTENT_PADDING[frame?.density ?? 'comfortable'],
      )}
    >
      <div
        key={frame?.pageKey}
        className={cn(
          'mx-auto w-full',
          frame?.contentWidth === 'full' ? 'max-w-none' : 'max-w-[var(--maw-layout-container-max,none)]',
          frame?.motion.page === 'fade' && 'animate-page-fade motion-reduce:animate-none',
          frame?.motion.page === 'rise' && 'animate-page-rise motion-reduce:animate-none',
          frame?.motion.page === 'slide' && 'animate-page-slide motion-reduce:animate-none',
          frame?.motion.page === 'zoom' && 'animate-page-zoom motion-reduce:animate-none',
          frame?.motion.page === 'blur' && 'animate-page-blur motion-reduce:animate-none',
        )}
      >
        {children}
      </div>
    </main>
  );

  // Inset: the whole app sits in a rounded card on a tinted canvas. Desktop only — on a phone the margin is wasted space.
  const inset = frame?.shape.frame === 'inset' && !isMobile;
  const shapeVars: CSSProperties | undefined =
    frame === undefined
      ? undefined
      : ({
          '--maw-shell-radius': CORNER_RADIUS[frame.shape.corners],
          ...(frame.shape.nav === 'pill'
            ? { '--maw-comp-nav-item-border-radius': '9999px', '--maw-comp-nav-item-active-border-radius': '9999px' }
            : {}),
        } as CSSProperties);

  const content = (
    <div
      data-layout-density={frame?.density}
      className={cn(
        'box-border flex overflow-hidden font-sans',
        inset
          ? 'h-full rounded-[var(--maw-shell-radius)] border border-border bg-[var(--maw-canvas)] shadow-lg'
          : 'h-[var(--maw-shell-height,100vh)] bg-[var(--maw-canvas)]',
        frame?.sidebar.position === 'right' && 'flex-row-reverse',
      )}
    >
      {frame !== undefined && (
        <a
          href="#maw-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-brand-contrast"
        >
          Skip to content
        </a>
      )}
      {!isMobile &&
        (floating ? (
          <div className="box-border flex h-full shrink-0 p-[var(--maw-space-md)] pr-0 [&>aside]:h-full [&>aside]:min-h-0 [&>aside]:rounded-[var(--maw-shell-radius,12px)] [&>aside]:border [&>aside]:shadow-md">
            {sidebar}
          </div>
        ) : (
          sidebar
        ))}
      {isMobile && (
        <Drawer
          open={menuOpen}
          onClose={onMenuClose}
          side="left"
          width={280}
          style={{ padding: 0 }}
          contentStyle={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {sidebar}
        </Drawer>
      )}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {showHeader && (
          <header
            className={cn(
              'maw-shell-chrome top-0 z-[var(--maw-z-sticky)] box-border flex shrink-0 items-center overflow-visible text-[var(--maw-shell-header-fg,var(--maw-shell-fg,var(--maw-fg)))]',
              sticky ? 'sticky' : 'relative',
              headerVariant === 'minimal'
                ? 'bg-transparent'
                : 'border-b border-[var(--maw-shell-header-border,var(--maw-shell-border,var(--maw-border)))] bg-[var(--maw-shell-header-bg,var(--maw-shell-bg,var(--maw-surface)))]',
              isMobile
                ? 'min-h-12 gap-1 py-1.5 pl-1 pr-2'
                : cn(
                    'gap-[var(--maw-space-md)]',
                    headerVariant === 'prominent' ? 'min-h-16 px-[var(--maw-space-xl)] shadow-md' : 'min-h-[var(--maw-layout-shell-header-height,auto)] p-[var(--maw-comp-shell-header-padding,12px_var(--maw-space-xl))]',
                    headerVariant === 'default' && 'shadow-[0_4px_24px_-6px_color-mix(in_srgb,#000_8%,transparent)]',
                  ),
            )}
            style={{ backdropFilter: 'blur(var(--maw-shell-blur, 0px))', WebkitBackdropFilter: 'blur(var(--maw-shell-blur, 0px))' }}
          >
            {isMobile && (
              <IconButton label="Menu" onClick={onMenuToggle} className="text-[var(--maw-shell-fg-muted,var(--maw-fgMuted))]">
                <Icon name="menu" size={18} />
              </IconButton>
            )}
            {isMobile ? (
              <>
                <h1 className="m-0 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold text-[var(--maw-shell-fg,var(--maw-fg))]">
                  {pageTitle}
                </h1>
                <div className="shrink-0">{actions}</div>
              </>
            ) : (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-[var(--maw-space-md)]">
                <div className="min-w-0 flex-1">{header}</div>
                <div className="shrink-0">{actions}</div>
              </div>
            )}
          </header>
        )}
        {panel === undefined ? (
          main
        ) : (
          <div className="relative flex min-h-0 flex-1">
            {main}
            <RightPanel panel={panel} />
          </div>
        )}
        {isMobile && frame?.mobileNav !== undefined && (
          <div className="shrink-0 border-t border-border bg-[var(--maw-surface)] pb-[env(safe-area-inset-bottom)]">{frame.mobileNav}</div>
        )}
        {!isMobile && (frame?.footer ?? true) && <PoweredBy />}
      </div>
    </div>
  );

  return (
    <div style={{ ...shapeVars, ...style }} className={cn('font-sans', inset ? 'box-border h-[var(--maw-shell-height,100vh)] bg-[color-mix(in_srgb,var(--maw-brand)_9%,var(--maw-bgSubtle))] p-[var(--maw-space-md)]' : '')}>
      {content}
    </div>
  );
}
