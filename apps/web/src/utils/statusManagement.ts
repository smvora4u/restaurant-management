/**
 * Centralized status management utilities for order and item status synchronization
 */

import { OrderStatus, ItemStatus } from './statusColors';

export interface OrderWithItems {
  id: string;
  status: OrderStatus;
  items: Array<{
    menuItemId: string;
    quantity: number;
    price: number;
    status: ItemStatus;
    specialInstructions?: string;
  }>;
}

/**
 * Determines the appropriate order status based on item statuses
 * Order status should reflect the overall progress of all items
 */
export const calculateOrderStatus = (items: Array<{ status: ItemStatus }>): OrderStatus => {
  if (items.length === 0) {
    return 'pending';
  }

  // Count items by status
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<ItemStatus, number>);

  const totalItems = items.length;
  const pendingCount = statusCounts.pending || 0;
  const confirmedCount = statusCounts.confirmed || 0;
  const preparingCount = statusCounts.preparing || 0;
  const readyCount = statusCounts.ready || 0;
  const servedCount = statusCounts.served || 0;
  const cancelledCount = statusCounts.cancelled || 0;

  // If any items are cancelled, check if all are cancelled
  if (cancelledCount > 0) {
    return cancelledCount === totalItems ? 'cancelled' : 'pending';
  }

  // If all items are served, order is completed
  if (servedCount === totalItems) {
    return 'completed';
  }

  // If all items are ready, order is ready
  if (readyCount === totalItems) {
    return 'ready';
  }

  // If any items are preparing, order is preparing
  if (preparingCount > 0) {
    return 'preparing';
  }

  // If any items are confirmed, order is confirmed
  if (confirmedCount > 0) {
    return 'confirmed';
  }

  // If all items are pending, order is pending
  if (pendingCount === totalItems) {
    return 'pending';
  }

  // Mixed statuses - determine the most advanced status
  if (readyCount > 0) return 'ready';
  if (preparingCount > 0) return 'preparing';
  if (confirmedCount > 0) return 'confirmed';
  
  return 'pending';
};

/**
 * Updates order status based on item statuses
 * This should be called whenever item statuses change
 */
export const syncOrderStatus = (order: OrderWithItems): OrderWithItems => {
  const newOrderStatus = calculateOrderStatus(order.items);
  
  return {
    ...order,
    status: newOrderStatus
  };
};

/**
 * Validates if a status transition is allowed
 * Prevents invalid status changes (e.g., going backwards)
 */
export const isValidStatusTransition = (
  currentStatus: ItemStatus | OrderStatus,
  newStatus: ItemStatus | OrderStatus
): boolean => {
  const statusHierarchy: (ItemStatus | OrderStatus)[] = [
    'pending',
    'confirmed', 
    'preparing',
    'ready',
    'served',
    'completed'
  ];

  const currentIndex = statusHierarchy.indexOf(currentStatus);
  const newIndex = statusHierarchy.indexOf(newStatus);

  // Cancelled can be set from any status
  if (newStatus === 'cancelled') {
    return true;
  }

  // Can't go backwards in the hierarchy
  if (newIndex < currentIndex) {
    return false;
  }

  // Can skip steps forward (e.g., pending -> ready)
  return true;
};

/**
 * Gets the next logical status in the workflow
 */
export const getNextStatus = (currentStatus: ItemStatus | OrderStatus): ItemStatus | OrderStatus | null => {
  const statusFlow: (ItemStatus | OrderStatus)[] = [
    'pending',
    'confirmed',
    'preparing', 
    'ready',
    'served',
    'completed'
  ];

  const currentIndex = statusFlow.indexOf(currentStatus);
  
  if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
    return null; // No next status
  }

  return statusFlow[currentIndex + 1];
};

/**
 * Gets the previous status in the workflow (for rollback scenarios)
 */
export const getPreviousStatus = (currentStatus: ItemStatus | OrderStatus): ItemStatus | OrderStatus | null => {
  const statusFlow: (ItemStatus | OrderStatus)[] = [
    'pending',
    'confirmed',
    'preparing',
    'ready', 
    'served',
    'completed'
  ];

  const currentIndex = statusFlow.indexOf(currentStatus);
  
  if (currentIndex <= 0) {
    return null; // No previous status
  }

  return statusFlow[currentIndex - 1];
};

/**
 * Checks if an order can be marked as completed
 * Order can only be completed when all items are served
 */
export const canCompleteOrder = (items: Array<{ status: ItemStatus }>): boolean => {
  return items.length > 0 && items.every(item => item.status === 'served');
};

/**
 * Checks if an order can be cancelled
 * Order can be cancelled if not already completed or cancelled
 */
export const canCancelOrder = (orderStatus: OrderStatus): boolean => {
  return !['completed', 'cancelled'].includes(orderStatus);
};

/**
 * Gets a summary of item statuses for display
 */
export const getItemStatusSummary = (items: Array<{ status: ItemStatus }>) => {
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<ItemStatus, number>);

  return {
    total: items.length,
    pending: statusCounts.pending || 0,
    confirmed: statusCounts.confirmed || 0,
    preparing: statusCounts.preparing || 0,
    ready: statusCounts.ready || 0,
    served: statusCounts.served || 0,
    cancelled: statusCounts.cancelled || 0
  };
};

/**
 * Bulk update item statuses and sync order status
 * This is the main function to use when updating multiple items
 */
export const updateItemStatuses = (
  order: OrderWithItems,
  updates: Array<{ itemIndex: number; newStatus: ItemStatus }>
): OrderWithItems => {
  const updatedItems = [...order.items];
  
  // Apply all updates
  updates.forEach(({ itemIndex, newStatus }) => {
    if (itemIndex >= 0 && itemIndex < updatedItems.length) {
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        status: newStatus
      };
    }
  });

  // Create updated order with new items
  const updatedOrder = {
    ...order,
    items: updatedItems
  };

  // Sync order status based on item statuses
  return syncOrderStatus(updatedOrder);
};
