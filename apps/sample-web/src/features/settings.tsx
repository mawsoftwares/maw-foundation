import { type ReactNode } from 'react';
import {
  Card,
  Badge,
  Toggle,
  Stack,
  Button,
  useToast,
  useDynamicAccess,
  RadioGroup,
  Select
} from '@mawsoftwares/ui-web';
import { useAppConfig, type FormLayout } from '../config-context';

export interface SettingsViewProps {
  readonly featureOverrides?: Readonly<Record<string, boolean>>;
  readonly onFeatureChange?: (key: string, enabled: boolean) => void;
}

export function SettingsView({ featureOverrides, onFeatureChange }: SettingsViewProps = {}): ReactNode {
  const toast = useToast();
  const { can } = useDynamicAccess();
  const { formLayout, setFormLayout, indiaOnly, setIndiaOnly, currency, setCurrency } = useAppConfig();

  return (
    <div>
      <Stack direction="row" align="center" style={{ justifyContent: 'space-between', marginBottom: 'var(--maw-space-xl)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>Settings</h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
            Manage platform configuration
          </p>
        </div>
        <Badge variant="warning">Superadmin Only</Badge>
      </Stack>

      <Card style={{ padding: 'var(--maw-space-lg)', marginBottom: 'var(--maw-space-xl)' }}>
        <h2 style={{ margin: 0, marginBottom: 'var(--maw-space-lg)', fontSize: 'var(--maw-text-lg)', fontWeight: 600, color: 'var(--maw-fg)' }}>
          Global Configuration
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--maw-space-xl)' }}>
          <RadioGroup
            name="formLayout"
            label="Form Overlay Layout"
            value={formLayout}
            onChange={(v) => setFormLayout(v as FormLayout)}
            direction="row"
            options={[
              { value: 'drawer', label: 'Sidebar (Drawer)' },
              { value: 'modal', label: 'Modal' },
            ]}
          />

          <Stack direction="row" align="center" gap="var(--maw-space-lg)" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 500, color: 'var(--maw-fg)' }}>India Only Mode</div>
              <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 2 }}>Restrict application features and defaults to India region</div>
            </div>
            <Toggle checked={indiaOnly} onChange={() => setIndiaOnly(!indiaOnly)} />
          </Stack>

          <Stack direction="row" align="center" gap="var(--maw-space-lg)" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 500, color: 'var(--maw-fg)' }}>Offline Mode</div>
              <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 2 }}>Enable offline-first data access with background sync</div>
            </div>
            <Toggle checked={featureOverrides?.offline ?? false} onChange={() => onFeatureChange?.('offline', !(featureOverrides?.offline ?? false))} />
          </Stack>

          <div style={{ maxWidth: 300 }}>
            <Select
              label="Global Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: 'INR', label: 'Indian Rupee (₹)' },
                { value: 'USD', label: 'US Dollar ($)' },
                { value: 'EUR', label: 'Euro (€)' },
                { value: 'GBP', label: 'British Pound (£)' },
              ]}
            />
          </div>
        </div>
      </Card>

      <Stack direction="row" gap="var(--maw-space-sm)" style={{ marginTop: 'var(--maw-space-xl)', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => toast.info('Changes discarded')}>Reset</Button>
          <Button onClick={() => toast.success('Settings saved')}>Save Changes</Button>
      </Stack>
    </div>
  );
}
