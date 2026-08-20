import type { ReactNode } from 'react';
import { Card, useDynamicAccess } from '@maw/ui-web';
import { palette, spacing } from '@maw/theme';
import { cardStyle, moduleBadgeStyle, permBadgeStyle } from '../styles';

export function PermissionsPanel(): ReactNode {
  const { isAdmin, permissions } = useDynamicAccess();
  return (
    <Card style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Your Permissions</h3>
      {isAdmin ? (
        <p style={{ color: palette.success }}>Admin — full access to everything</p>
      ) : permissions.length === 0 ? (
        <p style={{ color: palette.fgMuted }}>No permissions assigned</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
          {permissions.map((p) => (
            <code key={p} style={permBadgeStyle}>
              {p}
            </code>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ModulesPanel(): ReactNode {
  const { modules } = useDynamicAccess();
  return (
    <Card style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Registered Modules</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
        {modules.map((m) => (
          <span key={m.key} style={moduleBadgeStyle}>
            {m.name}
            <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>{m.audience}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}
