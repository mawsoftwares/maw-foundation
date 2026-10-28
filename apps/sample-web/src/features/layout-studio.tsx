import { useMemo, type ReactNode } from 'react';
import { Banner, LayoutStudio, Stack, useDynamicAccess } from '@mawsoftwares/ui-web';
import type { ProjectUiState } from '@mawsoftwares/layout';
import { PROJECT_UI_PUBLISHED_EVENT, projectUiStore } from '../layout-config';
import { projectThemeRegistry } from '../project-themes';

/** Layout Studio page. Access (Read_Layout) is enforced by the page guard in App; Update/Publish are checked inside. */
export function LayoutStudioView(): ReactNode {
  const { can } = useDynamicAccess();
  const prefersDark = useMemo(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches === true, []);
  const onPublished = (state: ProjectUiState): void => {
    window.dispatchEvent(new CustomEvent(PROJECT_UI_PUBLISHED_EVENT, { detail: state }));
  };
  return (
    <Stack direction="column" gap="var(--maw-space-lg)">
      <div>
        <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>Layout Studio</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--maw-fgMuted)' }}>
          Choose how this application is laid out. Changes stay in your draft until you publish.
        </p>
      </div>
      <Banner variant="info">
        Publishing applies the layout and theme choices for everyone in this project (they are stored on the server). A theme chosen here is layered over
        the shared theme from Theme Designer; each person's own light/dark choice still wins.
      </Banner>
      <LayoutStudio store={projectUiStore} themes={projectThemeRegistry} can={can} onPublished={onPublished} prefersDark={prefersDark} />
    </Stack>
  );
}
