import { useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';
import { Avatar } from './Avatar';
import { IconButton } from './IconButton';
import { Spinner } from './Spinner';

export interface ProfileAvatarUploadProps {
  readonly src?: string;
  readonly name?: string;
  readonly size?: number;
  readonly disabled?: boolean;
  readonly accept?: string;
  readonly maxSize?: number;
  readonly upload: (file: File, onProgress: (percent: number) => void) => Promise<StoredFile>;
  readonly onChange: (url: string) => void;
  readonly onError?: (message: string) => void;
  readonly style?: CSSProperties;
}

/**
 * Profile-only image control: a single circular avatar with an edit badge.
 * Choosing a file uploads it and updates the circle — no dropzone UI.
 */
export function ProfileAvatarUpload({
  src,
  name,
  size = 88,
  disabled,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024,
  upload,
  onChange,
  onError,
  style,
}: ProfileAvatarUploadProps): ReactNode {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(undefined);

  const displaySrc = preview ?? src;
  const badgeSize = Math.max(28, Math.round(size * 0.32));

  const openPicker = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onError?.('Please choose an image file');
      return;
    }
    if (file.size > maxSize) {
      onError?.(`Image is too large (max ${Math.round(maxSize / (1024 * 1024))}MB)`);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);
    try {
      const stored = await upload(file, () => undefined);
      onChange(stored.url);
      setPreview(undefined);
      URL.revokeObjectURL(localPreview);
    } catch (err) {
      setPreview(undefined);
      URL.revokeObjectURL(localPreview);
      onError?.(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
    >
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled || uploading}
        aria-label="Change profile photo"
        style={{
          display: 'block',
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: disabled || uploading ? 'default' : 'pointer',
          borderRadius: '50%',
        }}
      >
        <Avatar src={displaySrc} name={name} size={size} />
      </button>

      {uploading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spinner size={Math.round(size * 0.28)} />
        </div>
      )}

      <IconButton
        type="button"
        label="Edit profile photo"
        disabled={disabled || uploading}
        onClick={openPicker}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: badgeSize,
          height: badgeSize,
          borderRadius: '50%',
          background: 'var(--maw-bg)',
          border: '2px solid var(--maw-border)',
          color: 'var(--maw-fg)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          fontSize: Math.round(badgeSize * 0.45),
          lineHeight: 1,
        }}
      >
        ✎
      </IconButton>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled || uploading}
        onChange={(e) => { void handleChange(e); }}
        style={{ display: 'none' }}
      />
    </div>
  );
}
