import type { ReactNode } from 'react';
import { Button, FeatureHost, useAuth } from '@maw/ui-web';
import { palette, spacing, typography } from '@maw/theme';
import { registry } from '../features/index';
import { ModulesPanel, PermissionsPanel } from './chrome';

export function Dashboard(): ReactNode {
  const { session, logout } = useAuth();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ fontSize: typography.size.lg }}>{session?.role}</strong>
          <span style={{ color: palette.fgMuted, marginLeft: spacing.sm }}>{session?.userId}</span>
        </div>
        <Button variant="ghost" onClick={() => void logout()}>
          Log out
        </Button>
      </div>

      <PermissionsPanel />
      <ModulesPanel />
      <FeatureHost registry={registry} />
    </div>
  );
}
