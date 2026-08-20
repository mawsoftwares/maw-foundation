import { useState, type ReactNode } from 'react';
import { ApiError } from '@maw/api-client';
import { Button, Card, useDynamicAccess } from '@maw/ui-web';
import { palette, spacing } from '@maw/theme';
import { client } from '../api';
import { cardStyle, preStyle } from '../styles';

export function OrdersPanel(): ReactNode {
  const { can } = useDynamicAccess();
  const [data, setData] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Card style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Orders</h3>
      <div style={{ display: 'flex', gap: spacing.sm }}>
        {can('Read_Orders') && (
          <Button
            onClick={() => {
              setErr(null);
              client
                .request<{ orders: unknown[] }>('/orders')
                .then((r) => setData(JSON.stringify(r, null, 2)))
                .catch((e: ApiError) => setErr(`${e.status}: ${e.message}`));
            }}
          >
            Load orders
          </Button>
        )}
        {can('Create_Orders') && (
          <Button
            variant="ghost"
            onClick={() => {
              setErr(null);
              client
                .request('/orders', { method: 'POST', body: JSON.stringify({ item: 'Widget C', qty: 1 }) })
                .then((r) => setData(JSON.stringify(r, null, 2)))
                .catch((e: ApiError) => setErr(`${e.status}: ${e.message}`));
            }}
          >
            Create order
          </Button>
        )}
      </div>
      {data !== null && <pre style={preStyle}>{data}</pre>}
      {err !== null && <pre style={{ ...preStyle, color: palette.danger }}>{err}</pre>}
    </Card>
  );
}
