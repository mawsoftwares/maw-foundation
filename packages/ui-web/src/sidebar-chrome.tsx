import { useRef, useState, type ReactNode } from 'react';
import { Avatar } from './components/Avatar';
import { Button } from './components/Button';
import { Icon } from './components/Icon';
import { Popover } from './components/Popover';
import { useNavigation } from './navigation';
import { LiveDot } from './showcase';

const SHEEN =
  '@keyframes maw-sheen{0%,70%{background-position:150% 0}100%{background-position:-100% 0}}@media (prefers-reduced-motion:reduce){[data-maw-sheen]{animation:none!important}}';

/** "Gradient logo tile + product name + small caps subtitle" for the top of a sidebar (the MAW Hub's brand block). */
export function SidebarBrand({ collapsed, title, subtitle, icon = 'zap' }: { collapsed: boolean; title: string; subtitle?: string; icon?: string }): ReactNode {
  return (
    <div title={collapsed ? title : undefined} style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <style>{SHEEN}</style>
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: 12,
          color: '#ffffff',
          background: 'linear-gradient(135deg, var(--maw-brandDark), var(--maw-brand) 55%, var(--maw-brandLight))',
          boxShadow: '0 8px 20px -6px color-mix(in srgb, var(--maw-brand) 70%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.35)',
        }}
      >
        <Icon name={icon} size={20} />
        <span
          aria-hidden
          data-maw-sheen
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: 'linear-gradient(120deg, transparent 35%, rgb(255 255 255 / 0.45) 50%, transparent 65%)',
            backgroundSize: '250% 100%',
            animation: 'maw-sheen 6s ease-in-out infinite',
          }}
        />
      </span>
      {!collapsed && (
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.2 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--maw-shell-fg, var(--maw-fg))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          {subtitle !== undefined && (
            <span style={{ marginTop: 2, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--maw-shell-fg, var(--maw-fg)) 50%, transparent)' }}>{subtitle}</span>
          )}
        </span>
      )}
    </div>
  );
}

const formatRole = (role: string): string =>
  role.split(/[_\s-]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/** Signed-in user card for the bottom of a sidebar: ringed avatar with a live dot, name and role, and a menu. */
export function SidebarUser({ collapsed, name, role, avatar, profilePath = '/account' }: { collapsed: boolean; name: string; role: string; avatar?: string; profilePath?: string }): ReactNode {
  const { navigate } = useNavigation();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const tint = (pct: number): string => `color-mix(in srgb, var(--maw-shell-fg, var(--maw-fg)) ${pct}%, transparent)`;
  return (
    <div ref={anchor} style={{ width: '100%', minWidth: 0 }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? name : undefined}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: collapsed ? 'auto' : '100%',
          minWidth: 0,
          margin: collapsed ? '0 auto' : 0,
          padding: collapsed ? 0 : 8,
          borderRadius: 12,
          background: collapsed ? 'none' : tint(5),
          border: collapsed ? 'none' : `1px solid ${tint(8)}`,
          font: 'inherit',
          textAlign: 'left',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        <span style={{ position: 'relative', flexShrink: 0, padding: 2, borderRadius: '50%', background: 'linear-gradient(135deg, var(--maw-brand), var(--maw-brandLight))' }}>
          <span style={{ display: 'block', borderRadius: '50%', boxShadow: '0 0 0 2px var(--maw-shell-bg, var(--maw-surface))' }}>
            <Avatar src={avatar} name={name} size={30} />
          </span>
          <LiveDot style={{ position: 'absolute', right: 0, bottom: 0, width: 9, height: 9, outline: '2px solid var(--maw-shell-bg, var(--maw-surface))' }} />
        </span>
        {!collapsed && (
          <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, lineHeight: 1.3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--maw-shell-fg, var(--maw-fg))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
            <span style={{ fontSize: 11, color: tint(55), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatRole(role)}</span>
          </span>
        )}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchor} placement="top" align="start">
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(false);
            navigate(profilePath);
          }}
          style={{ width: '100%', minWidth: 160, justifyContent: 'flex-start' }}
        >
          Profile
        </Button>
      </Popover>
    </div>
  );
}
