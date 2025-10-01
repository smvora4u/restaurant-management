export const ORDER_STATUSES = [
  'pending',
  'confirmed', 
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled'
] as const;

export const ORDER_ITEM_STATUSES = [
  'pending',
  'confirmed',
  'preparing', 
  'ready',
  'served',
  'cancelled'
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];
export type OrderItemStatus = typeof ORDER_ITEM_STATUSES[number];
