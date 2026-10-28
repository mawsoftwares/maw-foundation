import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { defaultLayoutRegistry, resolveLayout } from '@mawsoftwares/layout';
import { toShellFrame } from '@mawsoftwares/ui-web';
import { AppShellView } from '@mawsoftwares/ui-web-tailwind';

/**
 * Structural regression net for every layout preset: the Tailwind shell's element tree and class names at desktop
 * and mobile. A change to a preset or to the shell's markup shows up as a readable snapshot diff to review. (This
 * is structural, not pixel, comparison — the repo has no browser screenshot tooling.)
 */
const noop = (): void => undefined;

function signature(html: string): string {
  return html
    .replace(/ style="[^"]*"/g, '')
    .replace(/></g, '>\n<')
    .replace(/(<[^>]+>)([^<]+)(?=<)/g, '$1\n  $2')
    .split('\n')
    .join('\n');
}

function shell(presetId: string, isMobile: boolean): string {
  const { settings } = resolveLayout({ version: 1, presetId });
  const frame = toShellFrame(settings, { rightPanel: 'RIGHT-PANEL', rightPanelLabel: 'Details', rightPanelFits: !isMobile, mobileNav: 'BOTTOM-NAV' });
  return signature(
    renderToStaticMarkup(
      createElement(AppShellView, {
        sidebar: createElement('aside', null, 'SIDEBAR'),
        header: 'HEADER',
        actions: 'ACTIONS',
        isMobile,
        menuOpen: false,
        onMenuToggle: noop,
        onMenuClose: noop,
        pageTitle: 'Page',
        frame,
        children: 'CONTENT',
      }),
    ),
  );
}

describe.each(defaultLayoutRegistry.listPresets().map((p) => p.id))('shell structure: %s', (id) => {
  it('desktop', () => expect(shell(id, false)).toMatchSnapshot());
  it('mobile', () => expect(shell(id, true)).toMatchSnapshot());
});

describe('cross-preset invariants', () => {
  const ids = defaultLayoutRegistry.listPresets().map((p) => p.id);

  it('every preset renders the same business content, header actions and a main landmark on desktop and mobile', () => {
    for (const id of ids) {
      for (const mobile of [false, true]) {
        const html = shell(id, mobile);
        for (const t of ['CONTENT', 'ACTIONS']) expect(html, `${id} ${mobile ? 'mobile' : 'desktop'}`).toContain(t);
        expect(html, id).toContain('<main');
        expect(html, id).toContain('href="#maw-main"');
      }
    }
  });

  it('mobile never shows the right panel or the desktop footer; only bottom-bar layouts show the bottom nav', () => {
    for (const id of ids) {
      const html = shell(id, true);
      expect(html, id).not.toContain('RIGHT-PANEL');
      expect(html, id).not.toContain('Powered by');
      const wantsBar = resolveLayout({ version: 1, presetId: id }).settings.responsive.mobileNavigation === 'bottom-bar';
      expect(html.includes('BOTTOM-NAV'), id).toBe(wantsBar);
    }
  });

  it('the right panel appears on desktop exactly for presets that enable it', () => {
    for (const id of ids) {
      const enabled = resolveLayout({ version: 1, presetId: id }).settings.rightPanel.enabled;
      const defaultOpen = resolveLayout({ version: 1, presetId: id }).settings.rightPanel.defaultOpen;
      expect(shell(id, false).includes('RIGHT-PANEL'), id).toBe(enabled && defaultOpen);
    }
  });
});
