import type { CSSProperties } from 'react';

export const rootStyle: CSSProperties = {
  fontFamily: 'var(--maw-font-family)',
  maxWidth: 700,
  margin: '40px auto',
  padding: 'var(--maw-space-lg)',
  color: 'var(--maw-fg)',
};

export const cardStyle: CSSProperties = { marginTop: 'var(--maw-space-md)' };

export const preStyle: CSSProperties = {
  background: 'var(--maw-bgMuted)',
  padding: 'var(--maw-space-sm)',
  borderRadius: 'var(--maw-radius-sm)',
  fontSize: 'var(--maw-text-sm)',
  overflow: 'auto',
  color: 'var(--maw-success)',
};

export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 'var(--maw-text-sm)',
};

export const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: 'var(--maw-space-xs) var(--maw-space-sm)',
  borderBottom: '2px solid var(--maw-border)',
  color: 'var(--maw-fgMuted)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

export const tdStyle: CSSProperties = {
  padding: 'var(--maw-space-xs) var(--maw-space-sm)',
  borderBottom: '1px solid var(--maw-border)',
  whiteSpace: 'nowrap',
};

export const badgeStyle: CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  color: '#fff',
  fontWeight: 600,
  fontSize: 'var(--maw-text-xs)',
};

export const moduleBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: 'var(--maw-radius-sm)',
  background: 'var(--maw-bgMuted)',
  border: '1px solid var(--maw-border)',
  fontSize: 'var(--maw-text-sm)',
};

export const permBadgeStyle: CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  background: 'var(--maw-bgMuted)',
  border: '1px solid var(--maw-border)',
  fontSize: 'var(--maw-text-xs)',
};
