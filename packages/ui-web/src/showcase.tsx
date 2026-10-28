import type { CSSProperties, ReactNode } from 'react';
import { Avatar } from './components/Avatar';
import { Progress } from './components/Progress';

export interface HeroBannerProps {
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  /** A button or link shown under the text. */
  readonly action?: ReactNode;
  /** Decorative artwork (an illustration or emoji) on the right. Hidden from assistive technology. */
  readonly art?: ReactNode;
  /** `brand`: a gradient in the brand colour. `soft`: a pale tint of it. */
  readonly tone?: 'brand' | 'soft';
  readonly style?: CSSProperties;
}

/**
 * A welcome / promo banner: big greeting, supporting line, optional action and artwork. Colours come only from the
 * theme tokens, so it follows whichever theme is active.
 */
export function HeroBanner({ title, subtitle, action, art, tone = 'brand', style }: HeroBannerProps): ReactNode {
  const brand = tone === 'brand';
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--maw-space-lg)',
        padding: 'var(--maw-space-xl)',
        minHeight: 132,
        borderRadius: 'var(--maw-radius-xl)',
        background: brand
          ? 'linear-gradient(120deg, var(--maw-brand), color-mix(in srgb, var(--maw-brand) 45%, var(--maw-brandLight, var(--maw-brand))))'
          : 'color-mix(in srgb, var(--maw-brand) 10%, var(--maw-surface))',
        color: brand ? 'var(--maw-brandContrast)' : 'var(--maw-fg)',
        ...style,
      }}
    >
      <span aria-hidden style={{ position: 'absolute', right: -40, top: -50, width: 190, height: 190, borderRadius: '50%', background: brand ? 'rgb(255 255 255 / 0.12)' : 'color-mix(in srgb, var(--maw-brand) 12%, transparent)' }} />
      <span aria-hidden style={{ position: 'absolute', right: 90, bottom: -70, width: 130, height: 130, borderRadius: '50%', background: brand ? 'rgb(255 255 255 / 0.10)' : 'color-mix(in srgb, var(--maw-brand) 8%, transparent)' }} />
      <div style={{ position: 'relative', minWidth: 0 }}>
        <div style={{ fontSize: 'var(--maw-text-xl)', fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
        {subtitle !== undefined && <div style={{ marginTop: 6, fontSize: 'var(--maw-text-sm)', opacity: 0.9 }}>{subtitle}</div>}
        {action !== undefined && <div style={{ marginTop: 'var(--maw-space-md)' }}>{action}</div>}
      </div>
      {art !== undefined && (
        <div aria-hidden style={{ position: 'relative', fontSize: 64, lineHeight: 1, flexShrink: 0 }}>
          {art}
        </div>
      )}
    </section>
  );
}

export interface ProfileCardProps {
  readonly name: string;
  readonly role?: string;
  readonly stats?: ReadonlyArray<{ readonly label: string; readonly value: ReactNode }>;
  /** A labelled progress bar (e.g. "Appointments limit 112 / 200"). */
  readonly progress?: { readonly label: string; readonly value: number; readonly max: number };
}

/** A person's card for a side panel: large avatar, name and role, a pair of stats and a progress bar. */
export function ProfileCard({ name, role, stats, progress }: ProfileCardProps): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--maw-space-md)', textAlign: 'center' }}>
      <div style={{ padding: 4, borderRadius: '50%', border: '2px solid color-mix(in srgb, var(--maw-brand) 40%, transparent)' }}>
        <Avatar name={name} size={72} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)' }}>{name}</div>
        {role !== undefined && <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>{role}</div>}
      </div>
      {stats !== undefined && stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 'var(--maw-space-md)', width: '100%', paddingTop: 'var(--maw-space-md)', borderTop: '1px solid var(--maw-border)' }}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <div style={{ fontWeight: 700, fontSize: 'var(--maw-text-lg)', color: 'var(--maw-fg)' }}>{stat.value}</div>
              <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}
      {progress !== undefined && (
        <div style={{ width: '100%', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginBottom: 6 }}>
            <span>{progress.label}</span>
            <span>{progress.value} / {progress.max}</span>
          </div>
          <Progress value={progress.value} max={progress.max} />
        </div>
      )}
    </div>
  );
}
