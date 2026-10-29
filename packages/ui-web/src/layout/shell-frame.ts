import type { ReactNode } from 'react';
import type { LayoutBreakpoint, LayoutSettings } from '@mawsoftwares/layout';
import { breakpoints } from '@mawsoftwares/theme';
import type { ShellFrame, SidebarLook } from '@mawsoftwares/ui-contract';

/** Pixel width at which a layout breakpoint begins (`md` → 768). Same numbers as the theme and `useBreakpoint`. */
export function layoutBreakpointPx(bp: LayoutBreakpoint): number {
  return breakpoints[bp];
}

/** `min-width` media query for a layout breakpoint: true at and above the breakpoint. */
export function layoutMinWidthQuery(bp: LayoutBreakpoint): string {
  return `(min-width: ${layoutBreakpointPx(bp)}px)`;
}

/** Pixel widths of the sidebar sizes. `md` is the classic shell's own 260px. */
export const SIDEBAR_WIDTH_PX = { sm: 200, md: 260, lg: 300 } as const;
export const RIGHT_PANEL_WIDTH_PX = { sm: 256, md: 320, lg: 384 } as const;

/** How a layout changes the sidebar's behaviour (the sidebar's own contents stay the app's). Pure. */
export interface SidebarBehavior {
  /** Variant `rail`: always the icon rail on desktop, no expand button. */
  readonly forceRail: boolean;
  /** Show the expand/collapse button (never for a forced rail). */
  readonly collapsible: boolean;
  readonly widthPx: number;
  /** `brand` in `sidebar.top`: keep the app's logo/title. */
  readonly showBrand: boolean;
  /** `user-menu` in `sidebar.bottom`: keep the app's sidebar footer. */
  readonly showFooter: boolean;
  /** Other approved ids to render above / below the navigation, via the app's `slots`. */
  readonly topExtras: readonly string[];
  readonly bottomExtras: readonly string[];
  /** Icon tiles with labels underneath: a fixed narrow bar that is never collapsed. */
  readonly labelsBelow: boolean;
  readonly look: SidebarLook;
}

export function sidebarBehavior(settings: LayoutSettings): SidebarBehavior {
  const { sidebar } = settings;
  const labelsBelow = sidebar.labels === 'below';
  const forceRail = sidebar.variant === 'rail' && !labelsBelow;
  return {
    forceRail,
    collapsible: sidebar.collapsible && !forceRail && !labelsBelow,
    widthPx: SIDEBAR_WIDTH_PX[sidebar.width],
    showBrand: sidebar.top.includes('brand'),
    showFooter: sidebar.bottom.includes('user-menu'),
    topExtras: sidebar.top.filter((id) => id !== 'brand'),
    bottomExtras: sidebar.bottom.filter((id) => id !== 'user-menu'),
    labelsBelow,
    look: {
      labels: sidebar.labels,
      expandOnHover: sidebar.expandOnHover,
      indicator: settings.shape.indicator,
      motion: { sidebar: settings.motion.sidebar, items: settings.motion.items, nav: settings.motion.nav },
    },
  };
}

export interface FrameOptions {
  /** Mobile bottom navigation bar; included only when the layout asks for `bottom-bar`. */
  readonly mobileNav?: ReactNode;
  /** App-supplied right panel content. Without it the panel is not rendered even if the layout enables it. */
  readonly rightPanel?: ReactNode;
  /** Accessible name of the right panel. */
  readonly rightPanelLabel?: string;
  /** Whether the viewport is at/above `responsive.rightPanelHideBelow`. */
  readonly rightPanelFits: boolean;
  /** Changing it replays the page entrance animation (the active page key). */
  readonly pageKey?: string;
}

/** Map resolved layout settings onto the plain structure kits render. Pure. */
export function toShellFrame(settings: LayoutSettings, options: FrameOptions): ShellFrame {
  const { sidebar, header, rightPanel, footer, content, density } = settings;
  const panelContent = options.rightPanel;
  return {
    density,
    sidebar: { position: sidebar.position, variant: sidebar.variant },
    header: { enabled: header.enabled, variant: header.variant, sticky: header.sticky },
    footer: footer.enabled,
    contentWidth: content.width,
    shape: { frame: settings.shape.frame, corners: settings.shape.corners, nav: settings.shape.nav, indicator: settings.shape.indicator },
    motion: { page: settings.motion.page },
    ...(options.pageKey !== undefined ? { pageKey: options.pageKey } : {}),
    ...(settings.responsive.mobileNavigation === 'bottom-bar' && options.mobileNav !== undefined ? { mobileNav: options.mobileNav } : {}),
    ...(rightPanel.enabled && options.rightPanelFits && panelContent !== undefined && panelContent !== null
      ? {
          rightPanel: {
            content: panelContent,
            label: options.rightPanelLabel ?? 'Details',
            width: rightPanel.width,
            collapsible: rightPanel.collapsible,
            defaultOpen: rightPanel.defaultOpen,
          },
        }
      : {}),
  };
}

/**
 * Resolve a list of approved component ids to nodes. Ids without a renderer are skipped (a layout may name a component
 * this app does not provide); the list order is preserved.
 */
export function composeSlot(ids: readonly string[], renderers: Readonly<Record<string, ReactNode>>): ReactNode[] {
  return ids.flatMap((id) => {
    const node = renderers[id];
    return node === undefined || node === null || node === false ? [] : [node];
  });
}
