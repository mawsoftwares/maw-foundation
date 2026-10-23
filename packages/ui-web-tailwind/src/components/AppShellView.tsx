import type { ReactNode } from 'react';
import type { AppShellViewProps } from '@mawsoftwares/ui-contract';
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

/**
 * Same props as the `AppShellView` in @mawsoftwares/ui-web: sidebar + sticky header + scrolling content (+ desktop footer); on mobile the
 * sidebar sits in a left Drawer and the header shows a menu button and `pageTitle`. Uses the kit's own Drawer and IconButton.
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
}: AppShellViewProps): ReactNode {
  const showHeader = header !== undefined || actions !== undefined || isMobile;
  return (
    <div style={style} className="box-border flex h-screen overflow-hidden bg-[var(--maw-canvas)] font-sans">
      {!isMobile && sidebar}
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
              'maw-shell-chrome sticky top-0 z-[var(--maw-z-sticky)] box-border flex shrink-0 items-center overflow-visible border-b border-[var(--maw-shell-border,var(--maw-border))] bg-[var(--maw-shell-bg,var(--maw-surface))] text-[var(--maw-shell-fg,var(--maw-fg))]',
              isMobile
                ? 'min-h-12 gap-1 py-1.5 pl-1 pr-2'
                : 'min-h-[var(--maw-layout-shell-header-height,auto)] gap-[var(--maw-space-md)] p-[var(--maw-comp-shell-header-padding,12px_var(--maw-space-xl))] shadow-[0_4px_24px_-6px_color-mix(in_srgb,#000_8%,transparent)]',
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
        <main
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden',
            isMobile ? 'p-[var(--maw-space-md)]' : 'p-[var(--maw-space-container-padding,var(--maw-space-xl))]',
          )}
        >
          <div className="mx-auto w-full max-w-[var(--maw-layout-container-max,none)]">{children}</div>
        </main>
        {!isMobile && <PoweredBy />}
      </div>
    </div>
  );
}
