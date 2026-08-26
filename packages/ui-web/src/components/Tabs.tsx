import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export function Tabs({
  tabs,
  activeTab,
  onChange,
  style,
}: {
  tabs: readonly { key: string; label: string }[];
  activeTab: string;
  onChange: (key: string) => void;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div style={{ ...base, display: 'flex', borderBottom: '1px solid var(--maw-border)', ...style }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            ...base,
            padding: 'var(--maw-space-sm) var(--maw-space-lg)',
            border: 'none',
            background: 'none',
            color: activeTab === tab.key ? 'var(--maw-brand)' : 'var(--maw-fgMuted)',
            fontWeight: activeTab === tab.key ? 600 : 400,
            fontSize: 'var(--maw-text-sm)',
            cursor: 'pointer',
            borderBottom: activeTab === tab.key ? '2px solid var(--maw-brand)' : '2px solid transparent',
            marginBottom: -1,
            transition: 'var(--maw-transition-fast)',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
