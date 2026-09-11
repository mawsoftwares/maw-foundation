import type { ReactNode } from 'react';
import { Card, Icon, useDynamicAccess, useNavigation } from '@mawsoftwares/ui-web';
import { SUPERADMIN_TOOLS } from '../superadmin-tools';

// ---------------------------------------------------------------------------
// Super Admin hub — a card per superadmin-only tool (RBAC, Menu Management,
// Feature Flags, UI Showcase). Each card is only shown if the signed-in user
// actually has the permission that tool's own page requires (data-driven,
// same permissions PageContent/PAGE_PERMISSIONS enforce) — this page never
// grants access, it just gathers the tools someone already has into one place.
// ---------------------------------------------------------------------------
export function SuperAdminView(): ReactNode {
  const { can } = useDynamicAccess();
  const { navigate } = useNavigation();

  const tools = SUPERADMIN_TOOLS.filter((tool) => tool.permission === undefined || can(tool.permission));

  return (
    <div className="maw-fade-in">
      <div style={{ marginBottom: 'var(--maw-space-xl)' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xxl)', fontWeight: 800, color: 'var(--maw-fg)', letterSpacing: '-0.02em' }}>
          Super Admin
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--maw-text-md)', color: 'var(--maw-fgMuted)' }}>
          Tools reserved for superadmin roles — roles &amp; permissions, navigation, feature flags, and the design system.
        </p>
      </div>

      {tools.length === 0 ? (
        <div style={{ padding: 'var(--maw-space-xl)', textAlign: 'center', color: 'var(--maw-fgMuted)' }}>
          You don't have access to any Super Admin tools.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--maw-space-lg)' }}>
          {tools.map((tool) => (
            <button
              key={tool.key}
              onClick={() => navigate(`/${tool.key}`)}
              style={{ background: 'none', border: 'none', padding: 0, margin: 0, textAlign: 'left', cursor: 'pointer', width: '100%', font: 'inherit' }}
            >
              <Card style={{ height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--maw-space-sm)' }}>
                  <span style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'color-mix(in srgb, var(--maw-brand) 12%, var(--maw-surface))', color: 'var(--maw-brand)',
                  }}>
                    <Icon name={tool.icon} size={20} />
                  </span>
                  <div style={{ fontWeight: 700, fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)' }}>{tool.label}</div>
                </div>
                <p style={{ margin: 0, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>{tool.description}</p>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
