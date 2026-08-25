import { createApiRouter } from '@maw/server-express';
import type { RequestHandler } from 'express';
import { listOrders, getOrder, createOrder } from './controller';

export function createOrdersRouter(deps: {
  requireAuth: RequestHandler;
  requirePermission: (perm: string) => RequestHandler;
}) {
  const { router, get, post } = createApiRouter({
    version: 'v1',
    prefix: '/api/v1/orders',
  });

  get('/', listOrders, {
    middleware: [deps.requireAuth, deps.requirePermission('Read_Orders')],
    metadata: { summary: 'List orders', tags: ['orders'] },
  });

  get('/:id', getOrder, {
    middleware: [deps.requireAuth, deps.requirePermission('Read_Orders')],
    metadata: { summary: 'Get order by ID', tags: ['orders'] },
  });

  post('/', createOrder, {
    middleware: [deps.requireAuth, deps.requirePermission('Create_Orders')],
    metadata: { summary: 'Create order', tags: ['orders'] },
  });

  return router;
}
