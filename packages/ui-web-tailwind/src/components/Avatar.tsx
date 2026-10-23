import type { ReactNode } from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import type { AvatarProps } from '@mawsoftwares/ui-contract';

function initialsOf(name: string | undefined): string {
  if (typeof name !== 'string' || name.trim().length === 0) return '?';
  return name
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Same props as the `Avatar` in @mawsoftwares/ui-web. Radix Avatar falls back to initials if the image is missing or fails. */
export function Avatar({ src, name, size = 40, style }: AvatarProps): ReactNode {
  return (
    <AvatarPrimitive.Root
      style={{ width: size, height: size, ...style }}
      className="box-border inline-flex shrink-0 select-none overflow-hidden rounded-full align-middle font-sans"
    >
      {src !== undefined && src.length > 0 && (
        <AvatarPrimitive.Image src={src} alt={name ?? ''} className="size-full object-cover" />
      )}
      <AvatarPrimitive.Fallback
        className="flex size-full items-center justify-center bg-brand font-semibold text-brand-contrast"
        style={{ fontSize: size * 0.4 }}
      >
        {initialsOf(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
