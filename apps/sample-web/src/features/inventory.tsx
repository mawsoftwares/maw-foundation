import { useState, type ReactNode } from 'react';
import { ApiError } from '@maw/api-client';
import { Button, Card } from '@maw/ui-web';
import { palette } from '@maw/theme';
import { client } from '../api';
import { cardStyle, preStyle } from '../styles';

export function InventoryPanel(): ReactNode {
  const [data, setData] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Card style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Inventory</h3>
      <Button
        onClick={() => {
          setErr(null);
          client
            .request<{ items: unknown[] }>('/inventory')
            .then((r) => setData(JSON.stringify(r, null, 2)))
            .catch((e: ApiError) => setErr(`${e.status}: ${e.message}`));
        }}
      >
        Load inventory
      </Button>
      {data !== null && <pre style={preStyle}>{data}</pre>}
      {err !== null && <pre style={{ ...preStyle, color: palette.danger }}>{err}</pre>}
    </Card>
  );
}
