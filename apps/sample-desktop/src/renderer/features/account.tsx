import { useState, type ReactNode } from 'react';
import { Tabs, useAuth } from '@mawsoftwares/ui-web';
import { ChangePasswordForm, SessionsManager, MfaSetup, UserProfileForm } from '@mawsoftwares/ui-auth';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';
import { client } from '../api';

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'password', label: 'Password' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'mfa', label: 'Two-Factor Auth' },
] as const;

async function uploadAvatar(
  file: File,
  onProgress: (percent: number) => void,
): Promise<StoredFile> {
  const formData = new FormData();
  formData.append('files', file);
  onProgress(10);
  const result = await client.upload<{ files: StoredFile[] }>('/files/upload', formData, {
    onProgress: (e) => onProgress(e.percent),
  });
  const uploaded = result.files[0];
  if (!uploaded) throw new Error('Upload returned no file');
  return uploaded;
}

export function AccountView(): ReactNode {
  const [activeTab, setActiveTab] = useState('profile');
  const { session } = useAuth();

  return (
    <div>
      <div style={{ marginBottom: 'var(--maw-space-xl)' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>Account & Security</h1>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
          Manage your profile details, password, sessions, and two-factor authentication
        </p>
      </div>
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} style={{ marginBottom: 'var(--maw-space-lg)' }} />
      <div style={{ paddingTop: 'var(--maw-space-md)' }}>
        {activeTab === 'profile' && session && (
          <UserProfileForm client={client} userId={session.userId} uploadAvatar={uploadAvatar} />
        )}
        {activeTab === 'password' && <ChangePasswordForm client={client} />}
        {activeTab === 'sessions' && <SessionsManager client={client} />}
        {activeTab === 'mfa' && <MfaSetup client={client} />}
      </div>
    </div>
  );
}
