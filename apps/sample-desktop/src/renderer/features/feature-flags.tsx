import { type ReactNode } from 'react';
import {
  Card,
  Stack,
  Divider,
  Toggle,
  useFeatureFlags,
  useDynamicAccess,
  ListPage,
} from '@mawsoftwares/ui-web';

export function FeatureFlagsView(): ReactNode {
  const { flags: ffFlags, _demoToggleFlag } = useFeatureFlags();
  const { can } = useDynamicAccess();
  
  // Guard the write actions
  const canUpdate = can('Update_FeatureFlags');

  return (
    <ListPage title="Feature Flags" createLabel={undefined}>
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
                {canUpdate ? (
                  <Toggle
                    checked={isEnabled}
                    onChange={(checked) => _demoToggleFlag?.(key, checked)}
                    label={isEnabled ? 'Enabled' : 'Disabled'}
                  />
                ) : (
                  <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 500, color: isEnabled ? 'var(--maw-success)' : 'var(--maw-fgMuted)' }}>
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                )}
              </Stack>
              {i < arr.length - 1 && <Divider />}
            </div>
          ))
        )}
      </Card>
    </ListPage>
  );
}
