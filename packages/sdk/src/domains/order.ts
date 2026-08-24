export const OrderStatus = {
  pending: 'pending',
  confirmed: 'confirmed',
  preparing: 'preparing',
  ready: 'ready',
  delivered: 'delivered',
  cancelled: 'cancelled',
} as const;

export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus];

export interface Order {
  readonly id: string;
  readonly item: string;
  readonly qty: number;
  readonly status?: OrderStatusValue;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface CreateOrderInput {
  readonly item: string;
  readonly qty: number;
}

export function validateOrderInput(input: CreateOrderInput): string | undefined {
  if (!input.item || input.item.trim() === '') return 'Item name is required';
  if (input.qty <= 0) return 'Quantity must be positive';
  return undefined;
}
