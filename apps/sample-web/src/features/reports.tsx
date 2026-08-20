import { useState, type ReactNode } from 'react';
import { ApiError } from '@maw/api-client';
import { Button, Card, Widget, WidgetGrid, MiniBarChart, MiniLineChart, ErrorState, PageLoader, useToast } from '@maw/ui-web';
import { client } from '../api';

export function ReportsView(): ReactNode {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const toast = useToast();

  const load = () => {
    setLoading(true);
    setError(undefined);
    client
      .request<{ report: string; rows: { label: string; value: number }[] }>('/reports')
      .then((r) => { setData(r); toast.success('Report loaded'); })
      .catch((e: ApiError) => setError(`${e.status}: ${e.message}`))
      .finally(() => setLoading(false));
  };

  if (error) return <ErrorState title="Failed to load reports" message={error} retry={load} />;
  if (loading) return <PageLoader message="Loading reports..." />;

  if (!data) {
    return (
      <div>
        <h2 style={{ color: 'var(--maw-fg)', marginTop: 0 }}>Reports</h2>
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--maw-space-xl)' }}>
            <p style={{ color: 'var(--maw-fgMuted)' }}>Click to fetch report data from the API</p>
            <Button onClick={load}>Load Reports</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: 'var(--maw-fg)', marginTop: 0 }}>Reports</h2>
      <WidgetGrid columns={2}>
        <Widget title="Revenue by Quarter">
          <MiniBarChart data={[45000, 52000, 61000, 72000]} height={120} />
        </Widget>
        <Widget title="Growth Trend">
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--maw-space-lg)' }}>
            <MiniLineChart data={[45, 52, 48, 61, 55, 72, 68, 75, 81]} width={250} height={100} />
          </div>
        </Widget>
      </WidgetGrid>
      <Card style={{ marginTop: 'var(--maw-space-lg)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Raw API Response</h3>
        <pre style={{ background: 'var(--maw-bgMuted)', padding: 'var(--maw-space-md)', borderRadius: 'var(--maw-radius-md)', fontSize: 'var(--maw-text-sm)', overflow: 'auto', color: 'var(--maw-success)' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
