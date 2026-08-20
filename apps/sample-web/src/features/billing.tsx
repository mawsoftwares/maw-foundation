import { useState, type ReactNode } from 'react';
import { ApiError } from '@maw/api-client';
import { Button, Card, useDynamicAccess } from '@maw/ui-web';
import { palette, spacing } from '@maw/theme';
import { client } from '../api';
import { cardStyle, preStyle } from '../styles';

export function BillingPanel(): ReactNode {
  const { can } = useDynamicAccess();
  const [data, setData] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Card style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Billing</h3>
      <div style={{ display: 'flex', gap: spacing.sm }}>
        {can('Read_Billing') && (
          <Button
            onClick={() => {
              setErr(null);
              client
                .request<{ bills: unknown[] }>('/billing')
                .then((r) => setData(JSON.stringify(r, null, 2)))
                .catch((e: ApiError) => setErr(`${e.status}: ${e.message}`));
            }}
          >
            Load bills
          </Button>
        )}
        {can('Create_Billing') && (
          <Button
            variant="ghost"
            onClick={() => {
              setErr(null);
              client
                .request('/billing', {
                  method: 'POST',
                  body: JSON.stringify({ amount: 9900, status: 'open' }),
                })
                .then((r) => setData(JSON.stringify(r, null, 2)))
                .catch((e: ApiError) => setErr(`${e.status}: ${e.message}`));
            }}
          >
            Create bill
          </Button>
        )}
      </div>
      {data !== null && <pre style={preStyle}>{data}</pre>}
      {err !== null && <pre style={{ ...preStyle, color: palette.danger }}>{err}</pre>}
    </Card>
  );
}
