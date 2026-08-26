import { useState, type ReactNode } from 'react';
import {
  Card,
  Badge,
  Button,
  Stack,
  Divider,
  useToast,
  useOffline,
  useBrand,
  useBrandColors,
} from '@maw/ui-web';

export function PlatformView(): ReactNode {
  const toast = useToast();
  const offline = useOffline();
  const { brand, switchTenant } = useBrand();
  const colors = useBrandColors();
  const [storageEntries, setStorageEntries] = useState<Array<{ key: string; value: string }>>([]);
  const [storeKey, setStoreKey] = useState('test-key');
  const [storeValue, setStoreValue] = useState('hello world');

  const handleSyncTrigger = () => {
    if (offline.syncEngine) {
      void offline.syncEngine.flush().then(() => toast.success('Sync completed'));
    } else {
      toast.warning('Sync engine not available — enable offline mode in Settings');
    }
  };

  const handleStorageWrite = () => {
    try {
      localStorage.setItem(`maw:offline:${storeKey}`, storeValue);
      toast.success(`Stored "${storeKey}"`);
      handleStorageRead();
    } catch {
      toast.error('Storage write failed');
    }
  };

  const handleStorageRead = () => {
    const entries: Array<{ key: string; value: string }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('maw:offline:')) {
        entries.push({ key: k.replace('maw:offline:', ''), value: localStorage.getItem(k) ?? '' });
      }
    }
    setStorageEntries(entries);
  };

  const handleStorageClear = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('maw:offline:')) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
    setStorageEntries([]);
    toast.info('Offline storage cleared');
  };

  const sectionTitle: React.CSSProperties = { margin: '0 0 var(--maw-space-md)', fontSize: 'var(--maw-text-md)', fontWeight: 600, color: 'var(--maw-fg)' };
  const label: React.CSSProperties = { fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', fontWeight: 500 };
  const value: React.CSSProperties = { fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)', fontWeight: 600 };

  return (
    <div>
      <Stack direction="row" align="center" style={{ justifyContent: 'space-between', marginBottom: 'var(--maw-space-xl)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>Platform</h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
            @maw/platform integration demo — offline storage, sync engine, brand config
          </p>
        </div>
      </Stack>

      {/* Network & Sync Status */}
      <h2 style={sectionTitle}>Network & Sync</h2>
      <Card style={{ padding: 'var(--maw-space-lg)', marginBottom: 'var(--maw-space-xl)' }}>
        <Stack direction="row" gap="var(--maw-space-xl)" style={{ flexWrap: 'wrap' }}>
          <div>
            <div style={label}>Network Status</div>
            <Badge variant={offline.isOnline ? 'success' : 'danger'}>
              {offline.networkStatus}
            </Badge>
          </div>
          <div>
            <div style={label}>Offline Mode</div>
            <Badge variant={offline.enabled ? 'info' : 'default'}>
              {offline.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div>
            <div style={label}>Sync State</div>
            <Badge variant={offline.syncState === 'syncing' ? 'warning' : 'default'}>
              {offline.syncState}
            </Badge>
          </div>
          <div>
            <div style={label}>Sync Progress</div>
            <div style={value}>
              {offline.syncProgress.completed}/{offline.syncProgress.total} ({offline.syncProgress.failed} failed)
            </div>
          </div>
        </Stack>
        <Divider style={{ margin: 'var(--maw-space-md) 0' }} />
        <Stack direction="row" gap="var(--maw-space-sm)">
          <Button onClick={handleSyncTrigger} variant="ghost">
            Trigger Sync
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (offline.networkManager) {
                toast.info('Network manager active — monitoring connectivity');
              } else {
                toast.warning('Network manager not available');
              }
            }}
          >
            Check Network Manager
          </Button>
        </Stack>
      </Card>

      {/* Offline Storage */}
      <h2 style={sectionTitle}>Offline Storage</h2>
      <Card style={{ padding: 'var(--maw-space-lg)', marginBottom: 'var(--maw-space-xl)' }}>
        <Stack direction="row" gap="var(--maw-space-sm)" align="end" style={{ marginBottom: 'var(--maw-space-md)' }}>
          <div style={{ flex: 1 }}>
            <div style={label}>Key</div>
            <input
              value={storeKey}
              onChange={(e) => setStoreKey(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 'var(--maw-radius-sm)',
                border: '1px solid var(--maw-border)', background: 'var(--maw-bg)', color: 'var(--maw-fg)',
                fontSize: 'var(--maw-text-sm)',
              }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <div style={label}>Value</div>
            <input
              value={storeValue}
              onChange={(e) => setStoreValue(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 'var(--maw-radius-sm)',
                border: '1px solid var(--maw-border)', background: 'var(--maw-bg)', color: 'var(--maw-fg)',
                fontSize: 'var(--maw-text-sm)',
              }}
            />
          </div>
          <Button onClick={handleStorageWrite}>Write</Button>
          <Button variant="ghost" onClick={handleStorageRead}>Read All</Button>
          <Button variant="ghost" onClick={handleStorageClear}>Clear</Button>
        </Stack>

        {storageEntries.length > 0 && (
          <div style={{
            border: '1px solid var(--maw-border)', borderRadius: 'var(--maw-radius-sm)',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--maw-text-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--maw-surface)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--maw-fg)' }}>Key</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--maw-fg)' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {storageEntries.map((e) => (
                  <tr key={e.key} style={{ borderTop: '1px solid var(--maw-border)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--maw-fg)', fontFamily: 'monospace' }}>{e.key}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--maw-fgMuted)' }}>{e.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {storageEntries.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'var(--maw-space-md)', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
            No offline storage entries. Click "Read All" to scan or "Write" to add one.
          </div>
        )}
      </Card>

      {/* Brand Config */}
      <h2 style={sectionTitle}>Brand Config</h2>
      <Card style={{ padding: 'var(--maw-space-lg)', marginBottom: 'var(--maw-space-xl)' }}>
        <Stack direction="row" gap="var(--maw-space-xl)" style={{ flexWrap: 'wrap', marginBottom: 'var(--maw-space-md)' }}>
          <div>
            <div style={label}>Tenant ID</div>
            <div style={value}>{brand.tenantId}</div>
          </div>
          <div>
            <div style={label}>Brand Name</div>
            <div style={value}>{brand.name}</div>
          </div>
          <div>
            <div style={label}>Short Name</div>
            <div style={value}>{brand.shortName ?? '—'}</div>
          </div>
          <div>
            <div style={label}>Font Family</div>
            <div style={value}>{brand.typography?.fontFamily ?? 'default'}</div>
          </div>
          <div>
            <div style={label}>Theme Mode</div>
            <Badge variant="info">{brand.theme?.mode ?? 'light'}</Badge>
          </div>
          <div>
            <div style={label}>Border Radius</div>
            <div style={value}>{brand.theme?.radius ?? 8}px</div>
          </div>
          <div>
            <div style={label}>Density</div>
            <Badge variant="default">{brand.theme?.density ?? 'normal'}</Badge>
          </div>
        </Stack>

        <Divider style={{ margin: 'var(--maw-space-md) 0' }} />

        <div style={{ marginBottom: 'var(--maw-space-md)' }}>
          <div style={{ ...label, marginBottom: 'var(--maw-space-sm)' }}>Color Palette</div>
          <Stack direction="row" gap="var(--maw-space-sm)" style={{ flexWrap: 'wrap' }}>
            {Object.entries(colors).map(([name, hex]) => (
              <div
                key={name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 'var(--maw-radius-sm)',
                  border: '1px solid var(--maw-border)', fontSize: 'var(--maw-text-xs)',
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: hex as string, border: '1px solid var(--maw-border)',
                }} />
                <span style={{ color: 'var(--maw-fgMuted)' }}>{name}</span>
                <code style={{ color: 'var(--maw-fg)', fontSize: 10 }}>{hex as string}</code>
              </div>
            ))}
          </Stack>
        </div>

        <Divider style={{ margin: 'var(--maw-space-md) 0' }} />

        <Stack direction="row" gap="var(--maw-space-sm)">
          <Button variant="ghost" onClick={() => { void switchTenant('client-a'); toast.success('Switched to Blue Corp'); }}>
            Blue Corp
          </Button>
          <Button variant="ghost" onClick={() => { void switchTenant('client-b'); toast.success('Switched to Green Bistro'); }}>
            Green Bistro
          </Button>
          <Button variant="ghost" onClick={() => { void switchTenant('client-c'); toast.success('Switched to Purple Cafe'); }}>
            Purple Cafe
          </Button>
        </Stack>
      </Card>
    </div>
  );
}
