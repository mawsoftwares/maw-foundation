import { useState } from 'react';
import { DetailPage, DetailField, Button } from '@mawsoftwares/ui-web';
import { Stack } from '@mawsoftwares/ui-web';
import type { UserResponseDto } from '@mawsoftwares/users';

export interface UserDetailsProps {
  user: UserResponseDto;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
}

export function UserDetails({ user, onEdit, onBack, onDelete, onActivate, onDeactivate }: UserDetailsProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: () => Promise<void> | void) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  const isActive = user.status === 'ACTIVE';

  const actions = (
    <>
      <Button 
        variant="ghost" 
        disabled={loading}
        onClick={() => handleAction(isActive ? onDeactivate : onActivate)}
      >
        {isActive ? 'Deactivate' : 'Activate'}
      </Button>
    </>
  );

  return (
    <DetailPage
      title={`${user.firstName} ${user.lastName}`}
      onBack={onBack}
      onEdit={onEdit}
      onDelete={() => handleAction(onDelete)}
      actions={actions}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--maw-space-lg)' }}>
        <DetailField label="User ID" value={user.id} />
        <DetailField 
          label="Status" 
          value={
            <span style={{ 
              padding: '2px 8px', 
              borderRadius: 12, 
              fontSize: 'var(--maw-text-xs)', 
              fontWeight: 600,
              backgroundColor: isActive ? 'var(--maw-success-bgMuted)' : 'var(--maw-danger-bgMuted)',
              color: isActive ? 'var(--maw-success-fg)' : 'var(--maw-danger-fg)'
            }}>
              {user.status.toUpperCase()}
            </span>
          } 
        />
        
        <DetailField label="Email" value={user.email} />
        <DetailField label="Phone" value={user.phone} />
        <DetailField label="Role" value={user.role ?? '—'} />
        <DetailField
          label="Avatar"
          value={user.avatar
            ? <img src={user.avatar} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
            : '—'}
        />
        
        <DetailField label="Created At" value={new Date(user.createdAt).toLocaleString()} />
        <DetailField label="Last Updated" value={new Date(user.updatedAt).toLocaleString()} />
      </div>
    </DetailPage>
  );
}
