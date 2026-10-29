import type { CSSProperties, ReactNode } from 'react';
import { Avatar } from './components/Avatar';
import { Progress } from './components/Progress';

/** Keyframes for the banner's drifting glow and the live dot's pulse; inline so they work in either UI kit. */
const FX_KEYFRAMES =
  '@keyframes maw-drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(6%,-8%) scale(1.12)}}' +
  '@keyframes maw-live-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--maw-success) 55%,transparent)}70%,100%{box-shadow:0 0 0 6px transparent}}' +
  '@media (prefers-reduced-motion:reduce){[data-maw-fx]{animation:none!important}}';

/** A small green dot that pulses to say "live / online". Decorative: pair it with text for assistive technology. */
export function LiveDot({ style }: { readonly style?: CSSProperties }): ReactNode {
  return (
    <>
      <style>{FX_KEYFRAMES}</style>
      <span aria-hidden data-maw-fx style={{ display: 'inline-block', width: 8, height: 8, flexShrink: 0, borderRadius: '50%', background: 'var(--maw-success)', animation: 'maw-live-pulse 2.4s ease-out infinite', ...style }} />
    </>
  );
}

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
      <style>{FX_KEYFRAMES}</style>
      <span aria-hidden data-maw-fx style={{ position: 'absolute', right: -40, top: -50, width: 190, height: 190, borderRadius: '50%', filter: 'blur(28px)', background: brand ? 'rgb(255 255 255 / 0.22)' : 'color-mix(in srgb, var(--maw-brand) 16%, transparent)', animation: 'maw-drift 14s ease-in-out infinite' }} />
      <span aria-hidden data-maw-fx style={{ position: 'absolute', right: 90, bottom: -70, width: 130, height: 130, borderRadius: '50%', filter: 'blur(24px)', background: brand ? 'color-mix(in srgb, var(--maw-brandLight, var(--maw-brand)) 70%, transparent)' : 'color-mix(in srgb, var(--maw-brand) 10%, transparent)', animation: 'maw-drift 14s ease-in-out -7s infinite' }} />
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

export interface FilterChipsProps {
  readonly options: ReadonlyArray<{ readonly key: string; readonly label: string }>;
  readonly value: string;
  readonly onChange: (key: string) => void;
  readonly label?: string;
}

/** A row of pill filters (one selected). The selected chip uses the brand colour; the rest are quiet. */
export function FilterChips({ options, value, onChange, label = 'Filter' }: FilterChipsProps): ReactNode {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--maw-space-sm)' }}>
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--maw-radius-pill)',
              border: selected ? '1px solid var(--maw-brand)' : '1px solid var(--maw-border)',
              background: selected ? 'var(--maw-brand)' : 'var(--maw-surface)',
              color: selected ? 'var(--maw-brandContrast)' : 'var(--maw-fgMuted)',
              fontFamily: 'var(--maw-font-family)',
              fontSize: 'var(--maw-text-sm)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export interface ListingCardProps {
  readonly title: string;
  /** Who it belongs to (company, owner). */
  readonly subtitle?: string;
  /** Small facts under the title, e.g. location and type. */
  readonly meta?: readonly string[];
  readonly tags?: readonly string[];
  /** Headline figure, e.g. a salary or price. */
  readonly highlight?: ReactNode;
  /** A button or link. */
  readonly action?: ReactNode;
  /** Emoji or logo shown in the tinted square. Hidden from assistive technology. */
  readonly logo?: ReactNode;
}

/** A listing card (job, product, property): tinted logo square, title, facts, tag pills, figure and action. */
export function ListingCard({ title, subtitle, meta, tags, highlight, action, logo }: ListingCardProps): ReactNode {
  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--maw-space-md)',
        padding: 'var(--maw-space-lg)',
        borderRadius: 'var(--maw-radius-xl)',
        background: 'var(--maw-surface)',
        border: '1px solid var(--maw-border)',
        boxShadow: 'var(--maw-shadow-sm)',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--maw-space-md)', minWidth: 0 }}>
        {logo !== undefined && (
          <div aria-hidden style={{ width: 48, height: 48, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 24, borderRadius: 'var(--maw-radius-lg)', background: 'color-mix(in srgb, var(--maw-brand) 12%, var(--maw-surface))' }}>
            {logo}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 'var(--maw-text-md)', fontWeight: 700, color: 'var(--maw-fg)' }}>{title}</h3>
          {subtitle !== undefined && <div style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>{subtitle}</div>}
        </div>
      </div>
      {meta !== undefined && meta.length > 0 && <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>{meta.join(' · ')}</div>}
      {tags !== undefined && tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.map((tag) => (
            <span key={tag} style={{ padding: '3px 10px', borderRadius: 'var(--maw-radius-pill)', fontSize: 'var(--maw-text-xs)', background: 'color-mix(in srgb, var(--maw-brand) 10%, var(--maw-surface))', color: 'var(--maw-brand)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      {(highlight !== undefined || action !== undefined) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--maw-space-sm)', marginTop: 'auto' }}>
          <div style={{ fontWeight: 700, color: 'var(--maw-fg)' }}>{highlight}</div>
          {action}
        </div>
      )}
    </article>
  );
}
