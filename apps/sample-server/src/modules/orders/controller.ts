import type { Controller } from '@maw/api';
import { ok, created, paginated, errorResult } from '@maw/api';
import { parseListQuery } from '@maw/api/dto/query-parser';
import { paginate } from '@maw/sdk/config/constants';
import type { CreateOrderBody, OrderResponse, OrderListQuery } from './dto';

const DEMO_ORDERS: OrderResponse[] = [
  { id: 'o1', item: 'Widget A', qty: 5, status: 'pending', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'o2', item: 'Widget B', qty: 3, status: 'shipped', createdAt: '2025-01-02T00:00:00Z', updatedAt: '2025-01-03T00:00:00Z' },
  { id: 'o3', item: 'Gadget C', qty: 1, status: 'pending', createdAt: '2025-01-04T00:00:00Z', updatedAt: '2025-01-04T00:00:00Z' },
];

export const listOrders: Controller =
  async ({ query }) => {
    const parsed = parseListQuery(query as Record<string, string | undefined>, {
      allowedSortFields: ['item', 'qty', 'createdAt'],
    });
    const typedQuery = query as unknown as OrderListQuery;

    let filtered = DEMO_ORDERS;
    if (typedQuery.status !== undefined) {
      filtered = filtered.filter((o) => o.status === typedQuery.status);
    }
    if (parsed.search !== undefined) {
      const term = parsed.search.toLowerCase();
      filtered = filtered.filter((o) => o.item.toLowerCase().includes(term));
    }

    const page = parsed.page ?? 1;
    const pageSize = parsed.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const slice = filtered.slice(start, start + pageSize);
    const result = paginate(slice, filtered.length, page, pageSize);
    return paginated(result);
  };

export const getOrder: Controller =
  async ({ params }) => {
    const { id } = params as { id: string };
    const order = DEMO_ORDERS.find((o) => o.id === id);
    if (order === undefined) {
      return errorResult('NOT_FOUND', `Order ${id} not found`);
    }
    return ok(order);
  };

export const createOrder: Controller =
  async ({ body }) => {
    const { item, qty } = body as CreateOrderBody;
    const order: OrderResponse = {
      id: `o${Date.now()}`,
      item,
      qty,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return created(order, 'Order created');
  };
