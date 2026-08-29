import { useState, useCallback, type ReactNode } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import { ApiError } from '@mawsoftwares/api-client';
import type { Order } from '@mawsoftwares/sdk';
import type { ApiSuccessResponse } from '@mawsoftwares/api/response/types';
import {
  useNativeTheme,
  useToast,
  useForm,
  Button,
  Badge,
  TextField,
  FormField,
  DataList,
  ErrorState,
  PageLoader,
  Modal,
  type DataListColumn,
} from '@mawsoftwares/ui-native';
import { client } from '../../src/api';

export default function OrdersScreen(): ReactNode {
  const { styles: t } = useNativeTheme();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [showCreate, setShowCreate] = useState(false);

  const loadOrders = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client
      .request<ApiSuccessResponse<Order[]>>('/api/v1/orders')
      .then((r) => {
        setOrders(r.data);
        setLoaded(true);
      })
      .catch((e: ApiError) => setError(`${e.status}: ${e.message}`))
      .finally(() => setLoading(false));
  }, []);

  const createForm = useForm({
    initialValues: { item: '', qty: '1' },
    fields: {
      item: { required: true },
      qty: { required: true, validate: (v) => (Number(v) > 0 ? undefined : 'Must be positive') },
    },
    onSubmit: async (values) => {
      try {
        await client.request('/api/v1/orders', {
          method: 'POST',
          body: JSON.stringify({ item: values.item, qty: Number(values.qty) }),
        });
        toast.success('Order created');
        setShowCreate(false);
        createForm.reset();
        loadOrders();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  const columns: DataListColumn<Order>[] = [
    {
      key: 'id',
      title: 'Order ID',
      render: (item) => (
        <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fg, fontFamily: t.typography.fontFamily }}>
          {item.id}
        </Text>
      ),
    },
    {
      key: 'item',
      title: 'Item',
      render: (item) => (
        <Text style={{
          fontSize: t.typography.size.sm,
          fontWeight: t.typography.weight.medium as TextStyle['fontWeight'],
          color: t.colors.fg,
          fontFamily: t.typography.fontFamily,
        }}>
          {item.item}
        </Text>
      ),
    },
    {
      key: 'qty',
      title: 'Qty',
      render: (item) => (
        <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fg, fontFamily: t.typography.fontFamily }}>
          {item.qty}
        </Text>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (item) => (
        <Badge variant={item.status === 'delivered' ? 'success' : 'info'}>
          {item.status ?? 'pending'}
        </Badge>
      ),
    },
  ];

  if (error) return <ErrorState title="Failed to load orders" message={error} retry={loadOrders} />;
  if (loading && !loaded) return <PageLoader message="Loading orders..." />;

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.canvas }}>
        <Button title="Load Orders from API" onPress={loadOrders} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.canvas }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: t.spacing.lg,
      }}>
        <Text style={{
          fontSize: t.typography.size.sm,
          color: t.colors.fgMuted,
          fontFamily: t.typography.fontFamily,
        }}>
          {orders.length} total orders
        </Text>
        <Button title="New Order" onPress={() => setShowCreate(true)} />
      </View>

      <DataList
        data={orders}
        columns={columns}
        keyExtractor={(o) => o.id}
        refreshing={loading}
        onRefresh={loadOrders}
        emptyTitle="No orders"
        emptyMessage="Tap 'New Order' to create one"
      />

      <Modal visible={showCreate} onClose={() => setShowCreate(false)} title="Create Order">
        <FormField label="Item Name" error={createForm.getFieldProps('item').error} required>
          <TextField
            value={createForm.values.item as string}
            onChangeText={createForm.getFieldProps('item').onChangeText}
            onBlur={createForm.getFieldProps('item').onBlur}
            placeholder="e.g. Widget C"
          />
        </FormField>
        <FormField label="Quantity" error={createForm.getFieldProps('qty').error} required>
          <TextField
            value={createForm.values.qty as string}
            onChangeText={createForm.getFieldProps('qty').onChangeText}
            onBlur={createForm.getFieldProps('qty').onBlur}
            keyboardType="numeric"
          />
        </FormField>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: t.spacing.sm, marginTop: t.spacing.lg }}>
          <Button variant="ghost" title="Cancel" onPress={() => setShowCreate(false)} />
          <Button
            title={createForm.submitting ? 'Creating...' : 'Create'}
            onPress={() => createForm.handleSubmit()}
            disabled={createForm.submitting}
            loading={createForm.submitting}
          />
        </View>
      </Modal>
    </View>
  );
}
