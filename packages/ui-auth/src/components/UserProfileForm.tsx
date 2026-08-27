import { useState, useEffect, useCallback, type CSSProperties, type ReactNode } from 'react';
import {
  Button,
  Card,
  TextField,
  useForm,
  FormField,
  useToast,
  Alert,
  Stack,
  Avatar,
  ProfileAvatarUpload,
  Badge,
} from '@mawsoftwares/ui-web';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';
import { ApiClient } from '@mawsoftwares/api-client';
import { useAuthT } from '../useAuthT';

export interface UserProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  createdAt: string;
  avatar?: string;
  role?: string;
}

export interface UserProfileFormProps {
  readonly client: ApiClient;
  readonly userId: string;
  readonly uploadAvatar?: (file: File, onProgress: (percent: number) => void) => Promise<StoredFile>;
}

const labelStyle: CSSProperties = {
  flex: '0 0 9.5rem',
  fontWeight: 500,
  color: 'var(--maw-fgMuted)',
  fontSize: 'var(--maw-text-sm)',
};

const valueStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  color: 'var(--maw-fg)',
  fontSize: 'var(--maw-text-sm)',
  wordBreak: 'break-word',
};

function DetailRow({
  label,
  children,
  last,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}): ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--maw-space-md)',
        padding: 'var(--maw-space-sm) 0',
        borderBottom: last ? 'none' : '1px solid var(--maw-border)',
      }}
    >
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{children}</span>
    </div>
  );
}

export function UserProfileForm({ client, userId, uploadAvatar }: UserProfileFormProps): ReactNode {
  const toast = useToast();
  const t = useAuthT();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [avatarError, setAvatarError] = useState<string>();

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await client.request<{ data?: UserProfileData } | UserProfileData>(`/api/v1/users/${userId}`);
      if (res && typeof res === 'object' && 'data' in res && res.data) {
        setProfile(res.data);
        setAvatarUrl(res.data.avatar);
      } else if (res) {
        const data = res as UserProfileData;
        setProfile(data);
        setAvatarUrl(data.avatar);
      } else {
        throw new Error(t('auth.noProfileData'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.profileLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [client, userId, t]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      phone: '',
    },
    fields: {
      firstName: { required: true },
      lastName: { required: true },
      phone: {},
    },
    onSubmit: async (values) => {
      try {
        await client.request(`/api/v1/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...values, avatar: avatarUrl }),
          headers: { 'Content-Type': 'application/json' },
        });
        toast.success(t('auth.profileUpdated'));
        setIsEditing(false);
        void fetchProfile();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('auth.profileUpdateFailed'));
      }
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone ?? '',
      });
      setAvatarUrl(profile.avatar);
      setAvatarError(undefined);
    }
  }, [profile]);

  if (loading) {
    return <Card><Alert variant="info">{t('auth.loadingProfile')}</Alert></Card>;
  }

  if (error || !profile) {
    return <Card><Alert variant="warning">{error || t('auth.profileNotFound')}</Alert></Card>;
  }

  const displayName = `${profile.firstName} ${profile.lastName}`.trim();

  return (
    <Card>
      <Stack direction="row" align="center" style={{ justifyContent: 'space-between', marginBottom: 'var(--maw-space-lg)' }}>
        <h3 style={{ margin: 0, color: 'var(--maw-fg)' }}>{t('auth.profileDetails')}</h3>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            {t('auth.editProfile')}
          </Button>
        )}
      </Stack>

      <div style={{ marginBottom: 'var(--maw-space-lg)' }}>
        {isEditing && uploadAvatar ? (
          <ProfileAvatarUpload
            src={avatarUrl}
            name={displayName}
            size={88}
            upload={uploadAvatar}
            onChange={(url) => {
              setAvatarUrl(url);
              setAvatarError(undefined);
            }}
            onError={setAvatarError}
          />
        ) : (
          <Avatar src={avatarUrl} name={displayName} size={88} />
        )}
        {avatarError && (
          <div style={{ marginTop: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-danger)' }}>
            {avatarError}
          </div>
        )}
      </div>

      {!isEditing ? (
        <div>
          <DetailRow label={t('auth.firstName')}>{profile.firstName}</DetailRow>
          <DetailRow label={t('auth.lastName')}>{profile.lastName}</DetailRow>
          <DetailRow label={t('auth.email')}>{profile.email}</DetailRow>
          <DetailRow label={t('auth.phone')}>{profile.phone || t('common.na')}</DetailRow>
          {profile.role && (
            <DetailRow label={t('auth.role')}>{profile.role}</DetailRow>
          )}
          <DetailRow label={t('common.status')}>
            <Badge variant={profile.status === 'ACTIVE' ? 'success' : 'warning'}>{profile.status}</Badge>
          </DetailRow>
          <DetailRow label={t('auth.memberSince')} last>
            {new Date(profile.createdAt).toLocaleDateString()}
          </DetailRow>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
          <FormField label={t('auth.firstName')} error={form.getFieldProps('firstName').error} required>
            <TextField value={form.values.firstName} onChange={form.getFieldProps('firstName').onChange} onBlur={form.getFieldProps('firstName').onBlur} />
          </FormField>
          <FormField label={t('auth.lastName')} error={form.getFieldProps('lastName').error} required>
            <TextField value={form.values.lastName} onChange={form.getFieldProps('lastName').onChange} onBlur={form.getFieldProps('lastName').onBlur} />
          </FormField>
          <FormField label={t('auth.phoneNumber')} error={form.getFieldProps('phone').error}>
            <TextField value={form.values.phone} onChange={form.getFieldProps('phone').onChange} onBlur={form.getFieldProps('phone').onBlur} />
          </FormField>
          <Stack direction="row" gap="var(--maw-space-sm)" style={{ marginTop: 'var(--maw-space-md)' }}>
            <Button type="submit" disabled={form.submitting}>
              {form.submitting ? t('common.loading') : t('common.save')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setAvatarUrl(profile.avatar);
                setAvatarError(undefined);
              }}
              disabled={form.submitting}
            >
              {t('common.cancel')}
            </Button>
          </Stack>
        </form>
      )}
    </Card>
  );
}
