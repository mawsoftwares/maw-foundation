import type { CSSProperties } from 'react';
import { palette, spacing, typography } from '@mawsoftwares/theme';

export const rootStyle: CSSProperties = {
  fontFamily: typography.fontFamily,
  maxWidth: 700,
  margin: '40px auto',
  padding: spacing.lg,
  color: palette.fg,
};

export const cardStyle: CSSProperties = { marginTop: spacing.md };

export const preStyle: CSSProperties = {
  background: palette.bgMuted,
  padding: spacing.sm,
  borderRadius: 6,
  fontSize: typography.size.sm,
  overflow: 'auto',
  color: palette.success,
};

export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: typography.size.sm,
};

export const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: `${spacing.xs}px ${spacing.sm}px`,
  borderBottom: `2px solid ${palette.border}`,
  color: palette.fgMuted,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

export const tdStyle: CSSProperties = {
  padding: `${spacing.xs}px ${spacing.sm}px`,
  borderBottom: `1px solid ${palette.border}`,
  whiteSpace: 'nowrap',
};

export const badgeStyle: CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  color: '#fff',
  fontWeight: 600,
  fontSize: typography.size.xs,
};

export const moduleBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: 6,
  background: palette.bgMuted,
  border: `1px solid ${palette.border}`,
  fontSize: typography.size.sm,
};

export const permBadgeStyle: CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  background: palette.bgMuted,
  border: `1px solid ${palette.border}`,
  fontSize: typography.size.xs,
};
