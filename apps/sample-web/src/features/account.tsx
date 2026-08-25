import { useState, type ReactNode } from 'react';
import { Tabs } from '@maw/ui-web';
import { ChangePasswordForm } from '../shell/ChangePasswordForm';
import { SessionsManager } from '../shell/SessionsManager';
import { MfaSetup } from '../shell/MfaSetup';

const TABS = [
  { key: 'password', label: 'Password' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'mfa', label: 'Two-Factor Auth' },
] as const;

export function AccountView(): ReactNode {
  const [activeTab, setActiveTab] = useState('password');

  return (
    <div>
      <div style={{ marginBottom: 'var(--maw-space-xl)' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>Account & Security</h1>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
          Manage your password, sessions, and two-factor authentication
        </p>
      </div>
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} style={{ marginBottom: 'var(--maw-space-lg)' }} />
      <div style={{ paddingTop: 'var(--maw-space-md)' }}>
        {activeTab === 'password' && <ChangePasswordForm />}
        {activeTab === 'sessions' && <SessionsManager />}
        {activeTab === 'mfa' && <MfaSetup />}
      </div>
    </div>
  );
}
