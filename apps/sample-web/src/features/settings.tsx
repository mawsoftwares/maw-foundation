import { useState, type ReactNode } from 'react';
import {
  Card,
  Badge,
  Toggle,
  Stack,
  Button,
  Divider,
  Tabs,
  useToast,
  useFeatureFlags,
  useDynamicAccess
} from '@mawsoftwares/ui-web';

interface FeatureToggle {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly category: string;
}

const FEATURES: readonly FeatureToggle[] = [
  { key: 'offline', label: 'Offline Mode', description: 'Enable offline-first data access with background sync', category: 'Core' },
  { key: 'darkMode', label: 'Dark Mode', description: 'Allow users to toggle between light and dark themes', category: 'Core' },
  { key: 'notifications', label: 'Push Notifications', description: 'Enable browser push notifications for real-time alerts', category: 'Core' },
  { key: 'auditLogs', label: 'Audit Logs', description: 'Track user actions and system events', category: 'Security' },
  { key: 'twoFactor', label: 'Two-Factor Auth', description: 'Require 2FA for all admin users', category: 'Security' },
  { key: 'apiAccess', label: 'API Access', description: 'Allow external API integrations via API keys', category: 'Integration' },
  { key: 'webhooks', label: 'Webhooks', description: 'Send event notifications to external URLs', category: 'Integration' },
  { key: 'exportCsv', label: 'CSV Export', description: 'Allow bulk data export in CSV format', category: 'Data' },
  { key: 'importCsv', label: 'CSV Import', description: 'Allow bulk data import from CSV files', category: 'Data' },
  { key: 'analytics', label: 'Analytics Dashboard', description: 'Advanced analytics and reporting widgets', category: 'Data' },
];

export interface SettingsViewProps {
  readonly featureOverrides?: Readonly<Record<string, boolean>>;
  readonly onFeatureChange?: (key: string, enabled: boolean) => void;
}

export function SettingsView({ featureOverrides, onFeatureChange }: SettingsViewProps = {}): ReactNode {
  const toast = useToast();
  const { flags: ffFlags, _demoToggleFlag } = useFeatureFlags();
  const { can } = useDynamicAccess();
  const canUpdateFeatureFlags = can('Update_FeatureFlags');

  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    for (const f of FEATURES) defaults[f.key] = featureOverrides?.[f.key] ?? (f.key === 'darkMode' || f.key === 'auditLogs');
    return defaults;
  });

  const categories = [...new Set(FEATURES.map((f) => f.category))];
  const allTabs = [...categories, 'Feature Flags'];
  const [activeTab, setActiveTab] = useState(allTabs[0] || 'Core');

  const toggle = (key: string) => {
    setFlags((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      toast.info(`${FEATURES.find((f) => f.key === key)?.label ?? key} ${next[key] ? 'enabled' : 'disabled'}`);
      onFeatureChange?.(key, next[key] ?? false);
      return next;
    });
  };

  return (
    <div>
      <Stack direction="row" align="center" style={{ justifyContent: 'space-between', marginBottom: 'var(--maw-space-xl)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>Settings</h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
            Manage feature flags and platform configuration
          </p>
        </div>
        <Badge variant="warning">Superadmin Only</Badge>
      </Stack>

      <Tabs
        tabs={allTabs.map(c => ({ key: c, label: c }))}
        activeTab={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 'var(--maw-space-lg)' }}
      />

      {activeTab === 'Feature Flags' ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {Object.keys(ffFlags).length === 0 ? (
            <div style={{ padding: 'var(--maw-space-md)', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
              No feature flags loaded.
            </div>
          ) : (
            Object.entries(ffFlags).map(([key, isEnabled], i, arr) => (
              <div key={key}>
                <Stack
                  direction="row"
                  align="center"
                  gap="var(--maw-space-lg)"
                  style={{ padding: 'var(--maw-space-md) var(--maw-space-lg)' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 500, color: 'var(--maw-fg)' }}>
                      {key}
                    </div>
                  </div>
                  <Toggle
                    checked={isEnabled}
                    onChange={(checked) => _demoToggleFlag?.(key, checked)}
                    label={isEnabled ? 'Enabled' : 'Disabled'}
                  />
                </Stack>
                {i < arr.length - 1 && <Divider />}
              </div>
            ))
          )}
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {FEATURES.filter((f) => f.category === activeTab).map((feature, i, arr) => (
            <div key={feature.key}>
              <Stack
                direction="row"
                align="center"
                gap="var(--maw-space-lg)"
                style={{ padding: 'var(--maw-space-md) var(--maw-space-lg)' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 500, color: 'var(--maw-fg)' }}>
                    {feature.label}
                  </div>
                  <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 2 }}>
                    {feature.description}
                  </div>
                </div>
                <Toggle
                  checked={flags[feature.key] ?? false}
                  onChange={() => toggle(feature.key)}
                  label={feature.label}
                />
              </Stack>
              {i < arr.length - 1 && <Divider />}
            </div>
          ))}
        </Card>
      )}

      {activeTab !== 'Feature Flags' && (
        <Card style={{ padding: 'var(--maw-space-lg)', marginTop: 'var(--maw-space-lg)' }}>
          <Stack direction="row" align="center" gap="var(--maw-space-md)">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 600, color: 'var(--maw-fg)' }}>
                Active features
              </div>
              <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 2 }}>
                {Object.values(flags).filter(Boolean).length} of {FEATURES.length} features enabled
              </div>
            </div>
            <Stack direction="row" gap="4px" style={{ flexWrap: 'wrap' }}>
              {FEATURES.filter((f) => flags[f.key]).map((f) => (
                <Badge key={f.key} variant="success">{f.label}</Badge>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}

      {activeTab !== 'Feature Flags' && (
        <Stack direction="row" gap="var(--maw-space-sm)" style={{ marginTop: 'var(--maw-space-xl)', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => toast.info('Changes discarded')}>Reset</Button>
          <Button onClick={() => toast.success('Settings saved')}>Save Changes</Button>
        </Stack>
      )}
    </div>
  );
}
