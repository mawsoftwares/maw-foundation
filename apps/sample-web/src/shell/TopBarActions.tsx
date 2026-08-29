import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from 'react';
import {
  useAuth,
  useBrand,
  useI18n,
  useToast,
  Button,
  Avatar,
  Popover,
} from '@mawsoftwares/ui-web';
import { AVAILABLE_TENANTS } from '../brand-setup';
import { client } from '../api';
import { API_BASE_URL } from '../config';

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--maw-radius-md)',
  border: '1px solid var(--maw-border)',
  fontSize: 'var(--maw-text-sm)',
  background: 'var(--maw-bgSubtle)',
  color: 'var(--maw-fg)',
};

const rowLabel: CSSProperties = {
  fontSize: 'var(--maw-text-xs)',
  fontWeight: 600,
  color: 'var(--maw-fgMuted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 6,
};

interface HeaderProfile {
  readonly avatar?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly email?: string;
}

function resolveMediaUrl(url: string | undefined): string | undefined {
  if (url === undefined || url.length === 0) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${path}`;
}

function displayNameFrom(profile: HeaderProfile | null, userId: string): string {
  const name = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  if (name.length > 0) return name;
  if (profile?.email !== undefined && profile.email.length > 0) return profile.email;
  return userId;
}

function readProfile(res: { data?: HeaderProfile } | HeaderProfile | null): HeaderProfile | null {
  if (res === null || typeof res !== 'object') return null;
  if ('data' in res && res.data !== undefined) return res.data;
  return res as HeaderProfile;
}

export function TopBarActions(): ReactNode {
  const { session, logout } = useAuth();
  const { t, locale, setLocale, availableLocales } = useI18n();
  const { isDark, toggleColorMode, brand, switchTenant } = useBrand();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchor = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);

  useEffect(() => {
    if (session === null) return;
    let alive = true;
    void client.request<{ data?: HeaderProfile } | HeaderProfile>(`/api/v1/users/${session.userId}`)
      .then((res) => {
        if (alive) setProfile(readProfile(res));
      })
      .catch(() => {
        if (alive) setProfile(null);
      });
    return () => { alive = false; };
  }, [session]);

  if (session === null) return null;

  const displayName = displayNameFrom(profile, session.userId);
  const avatarSrc = resolveMediaUrl(profile?.avatar);

  const menu = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--maw-border)' }}>
        <Avatar src={avatarSrc} name={displayName} size={40} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--maw-fg)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
          <div style={{ fontSize: 11, color: 'var(--maw-brand)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            {session.role}
          </div>
        </div>
      </div>

      <div>
        <div style={rowLabel}>Workspace</div>
        <select
          value={brand.tenantId}
          onChange={(e) => {
            void switchTenant(e.target.value);
            toast.success(`Brand: ${e.target.value}`);
          }}
          style={selectStyle}
        >
          {AVAILABLE_TENANTS.map((tid) => (
            <option key={tid} value={tid}>{tid}</option>
          ))}
        </select>
      </div>

      <div>
        <div style={rowLabel}>Language</div>
        <select
          value={locale}
          onChange={(e) => {
            setLocale(e.target.value);
            toast.info(`Language: ${e.target.value.toUpperCase()}`);
          }}
          style={selectStyle}
        >
          {availableLocales.map((l) => (
            <option key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <div>
        <div style={rowLabel}>Theme</div>
        <Button variant="ghost" onClick={toggleColorMode} style={{ width: '100%' }}>
          {isDark ? '☀️ Light' : '🌙 Dark'}
        </Button>
      </div>

      <Button
        variant="danger"
        onClick={() => void logout()}
        style={{ width: '100%', marginTop: 4 }}
      >
        {t('auth.logout')}
      </Button>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <div ref={menuAnchor}>
        <button
          type="button"
          aria-label="Account menu"
          onClick={() => setMenuOpen((open) => !open)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px 4px 4px',
            borderRadius: 'var(--maw-radius-pill)',
            border: '1px solid var(--maw-border)',
            background: 'var(--maw-bg)',
            cursor: 'pointer',
            maxWidth: 220,
          }}
        >
          <Avatar src={avatarSrc} name={displayName} size={28} />
          <span style={{
            fontSize: 'var(--maw-text-sm)',
            fontWeight: 600,
            color: 'var(--maw-fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {displayName}
          </span>
        </button>
      </div>
      <Popover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={menuAnchor}
        placement="bottom"
        align="end"
      >
        {menu}
      </Popover>
    </div>
  );
}
