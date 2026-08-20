import { useState, type ReactNode } from 'react';
import { ApiError } from '@maw/api-client';
import { ListPage, DataTable, Avatar, Button, useToast, ErrorState, PageLoader, type ColumnDef } from '@maw/ui-web';
import { client } from '../api';

interface User {
  email: string;
}

const COLUMNS: ColumnDef<User>[] = [
  {
    key: 'avatar',
    header: '',
    width: 50,
    render: (row) => <Avatar name={row.email} size={28} />,
  },
  { key: 'email', header: 'Email', sortable: true },
];

export function UsersView(): ReactNode {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();

  const load = () => {
    setLoading(true);
    setError(undefined);
    client
      .request<{ users: string[] }>('/admin/users')
      .then((r) => { setUsers(r.users.map((email) => ({ email }))); setLoaded(true); toast.success('Users loaded'); })
      .catch((e: ApiError) => setError(`${e.status}: ${e.message}`))
      .finally(() => setLoading(false));
  };

  if (error) return <ErrorState title="Failed to load users" message={error} retry={load} />;
  if (loading && !loaded) return <PageLoader message="Loading users..." />;

  if (!loaded) {
    return (
      <ListPage title="Users">
        <div style={{ textAlign: 'center', padding: 'var(--maw-space-xxl)' }}>
          <Button onClick={load}>Load Users</Button>
        </div>
      </ListPage>
    );
  }

  return (
    <ListPage title="Users" description={`${users.length} registered users`}>
      <DataTable columns={COLUMNS} data={users} keyField="email" />
    </ListPage>
  );
}
