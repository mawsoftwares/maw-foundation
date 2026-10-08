import { useMemo, useState, type ReactNode } from 'react';
import { Button, Card, Stack } from '@mawsoftwares/ui-web';
import { exportThemeBundle, type ThemeBundle, type ThemeOverrides } from '@mawsoftwares/theme';

type FileName = keyof ThemeBundle;
const FILES: readonly FileName[] = ['theme.json', 'theme.css', 'theme.ts'];
const MIME: Readonly<Record<FileName, string>> = { 'theme.json': 'application/json', 'theme.css': 'text/css', 'theme.ts': 'text/plain' };

function download(name: FileName, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: MIME[name] }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download or preview the current theme as theme.json, theme.css and theme.ts. */
export function ThemeExportPanel({ overrides, name }: { overrides: ThemeOverrides; name?: string }): ReactNode {
  const [shown, setShown] = useState<FileName>('theme.json');
  const bundle = useMemo(() => exportThemeBundle(overrides, name === undefined ? {} : { name }), [overrides, name]);

  return (
    <Card>
      <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Export</h3>
      <Stack direction="row" gap="var(--maw-space-sm)" style={{ flexWrap: 'wrap' }}>
        {FILES.map((file) => (
          <Button key={file} variant={shown === file ? 'primary' : 'outline'} onClick={() => setShown(file)}>{file}</Button>
        ))}
        <Button variant="secondary" onClick={() => download(shown, bundle[shown])}>Download {shown}</Button>
      </Stack>
      <pre
        aria-label={`${shown} preview`}
        style={{ maxHeight: 260, overflow: 'auto', margin: 'var(--maw-space-md) 0 0', padding: 'var(--maw-space-md)', background: 'var(--maw-bgMuted)', color: 'var(--maw-fg)', borderRadius: 'var(--maw-radius-md)', fontSize: 'var(--maw-text-xs)', fontFamily: 'var(--maw-font-mono)' }}
      >
        {bundle[shown]}
      </pre>
    </Card>
  );
}
