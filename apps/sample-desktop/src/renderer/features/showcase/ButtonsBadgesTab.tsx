import type { ReactNode } from 'react';
import {
  Button,
  Card,
  Badge,
  Divider,
  Avatar,
  IconButton,
  Select,
  Tooltip,
  Stack,
  DropdownMenu,
  useToast,
  useColorMode,
  useI18n,
} from '@mawsoftwares/ui-web';

interface Props {
  locale: string;
  setLocale: (v: string) => void;
}

export function ButtonsBadgesTab({ locale, setLocale }: Props): ReactNode {
  const toast = useToast();
  const { isDark, toggleColorMode } = useColorMode();
  const { } = useI18n();

  return (
    <Card>
      <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Buttons</h3>
      <Stack direction="row" gap="var(--maw-space-sm)">
        <Button>Primary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button disabled>Disabled</Button>
      </Stack>

      <Divider />

      <h3 style={{ color: 'var(--maw-fg)' }}>Badges</h3>
      <Stack direction="row" gap="var(--maw-space-sm)">
        <Badge>Default</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="danger">Danger</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="info">Info</Badge>
      </Stack>

      <Divider />

      <h3 style={{ color: 'var(--maw-fg)' }}>Avatars</h3>
      <Stack direction="row" gap="var(--maw-space-sm)" align="center">
        <Avatar name="Alice Johnson" size={40} />
        <Avatar name="Bob Smith" size={32} />
        <Avatar name="Charlie" size={24} />
      </Stack>

      <Divider />

      <h3 style={{ color: 'var(--maw-fg)' }}>IconButton &amp; Tooltip</h3>
      <Stack direction="row" gap="var(--maw-space-sm)">
        <Tooltip content="Edit item">
          <IconButton label="Edit">✏️</IconButton>
        </Tooltip>
        <Tooltip content="Delete item">
          <IconButton label="Delete">🗑️</IconButton>
        </Tooltip>
        <Tooltip content="Settings">
          <IconButton label="Settings">⚙️</IconButton>
        </Tooltip>
      </Stack>

      <Divider />

      <h3 style={{ color: 'var(--maw-fg)' }}>DropdownMenu</h3>
      <DropdownMenu
        trigger={<Button variant="ghost">Actions ▾</Button>}
        items={[
          { key: 'edit', label: 'Edit', onClick: () => toast.info('Edit clicked') },
          { key: 'duplicate', label: 'Duplicate', onClick: () => toast.info('Duplicate clicked') },
          { key: 'delete', label: 'Delete', danger: true, onClick: () => toast.warning('Delete clicked') },
        ]}
      />

      <Divider />

      <h3 style={{ color: 'var(--maw-fg)' }}>Theme Controls</h3>
      <Stack direction="row" gap="var(--maw-space-md)" align="center">
        <Button variant="ghost" onClick={toggleColorMode}>
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </Button>
        <Select
          options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' }, { value: 'mr', label: 'Marathi' }]}
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          style={{ width: 140 }}
        />
      </Stack>
    </Card>
  );
}
