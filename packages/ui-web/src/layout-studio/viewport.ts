import type { LayoutSettings } from '@mawsoftwares/layout';
import { breakpoints } from '@mawsoftwares/theme';
import { RIGHT_PANEL_WIDTH_PX, SIDEBAR_WIDTH_PX } from '../layout/shell-frame';

export type PreviewViewport = 'desktop' | 'tablet' | 'mobile';

/** Representative widths for the preview frames (px). */
export const PREVIEW_VIEWPORTS: Readonly<Record<PreviewViewport, { readonly label: string; readonly width: number }>> = {
  desktop: { label: 'Desktop', width: 1280 },
  tablet: { label: 'Tablet', width: 820 },
  mobile: { label: 'Mobile', width: 390 },
};


export interface PreviewState {
  readonly isMobile: boolean;
  readonly sidebar: 'none' | 'drawer' | 'docked' | 'floating' | 'rail';
  readonly sidebarPosition: 'left' | 'right';
  readonly sidebarWidth: number;
  readonly header: boolean;
  readonly headerVariant: LayoutSettings['header']['variant'];
  readonly rightPanel: boolean;
  readonly rightPanelWidth: number;
  readonly footer: boolean;
  /** Mobile only: a bottom tab bar (the drawer stays reachable from the header menu). */
  readonly bottomBar: boolean;
  readonly contentWidth: LayoutSettings['content']['width'];
  readonly density: LayoutSettings['density'];
}

/**
 * What the shell would show at `widthPx`. Mirrors AppShell's rules (mobile below `sidebarCollapseBelow`, right panel
 * only at/above `rightPanelHideBelow`, no footer on mobile), computed from width instead of the window so a preview
 * can be any size without touching the real viewport.
 */
export function previewState(settings: LayoutSettings, widthPx: number): PreviewState {
  const { sidebar, header, rightPanel, footer, content, responsive, density } = settings;
  const isMobile = widthPx < breakpoints[responsive.sidebarCollapseBelow];
  return {
    isMobile,
    sidebar: !sidebar.enabled ? 'none' : isMobile ? 'drawer' : sidebar.variant,
    sidebarPosition: sidebar.position,
    sidebarWidth: SIDEBAR_WIDTH_PX[sidebar.width],
    header: header.enabled || isMobile,
    headerVariant: header.variant,
    rightPanel: rightPanel.enabled && !isMobile && widthPx >= breakpoints[responsive.rightPanelHideBelow],
    rightPanelWidth: RIGHT_PANEL_WIDTH_PX[rightPanel.width],
    footer: footer.enabled && !isMobile,
    bottomBar: isMobile && sidebar.enabled && responsive.mobileNavigation === 'bottom-bar',
    contentWidth: content.width,
    density,
  };
}

/** A sentence for screen readers, since the wireframe itself is a picture. */
export function describePreview(state: PreviewState): string {
  const parts: string[] = [];
  parts.push(
    state.sidebar === 'none' ? 'no sidebar'
    : state.sidebar === 'drawer' ? (state.bottomBar ? 'navigation in a bottom bar and menu drawer' : 'navigation in a menu drawer')
    : `${state.sidebar} sidebar on the ${state.sidebarPosition}`,
  );
  parts.push(state.header ? `${state.headerVariant} header` : 'no header');
  if (state.rightPanel) parts.push('right panel');
  parts.push(state.footer ? 'footer' : 'no footer');
  parts.push(`${state.contentWidth} width content, ${state.density} density`);
  return parts.join(', ');
}
