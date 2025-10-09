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

  // If all items are cancelled -> order cancelled
  if (cancelledCount === totalItems) {
    return 'cancelled';
  }

  // For status calculation, ignore cancelled items
  const effectiveTotal = totalItems - cancelledCount;
  const allServed = servedCount === effectiveTotal && effectiveTotal > 0;
  const allReady = readyCount === effectiveTotal && effectiveTotal > 0;
  const allPreparing = preparingCount === effectiveTotal && effectiveTotal > 0;
  const allConfirmed = confirmedCount === effectiveTotal && effectiveTotal > 0;
  const allPending = pendingCount === effectiveTotal && effectiveTotal > 0;

  // If all items are served, order is served (not completed)
  // Order becomes completed only when explicitly marked via Complete Order button
  if (allServed) {
    return 'served';
  }

  // If all items are ready, order is ready
  if (allReady) {
    return 'ready';
  }

  // If all items are preparing, order is preparing
  if (allPreparing) {
    return 'preparing';
  }

  // If all items are confirmed, order is confirmed
  if (allConfirmed) {
    return 'confirmed';
  }

  // If all items are pending, order is pending
  if (allPending) {
    return 'pending';
  }

  // Mixed statuses - determine the LEAST advanced status (most work still needed)
  // This ensures the order reflects the earliest stage of work remaining
  // Ignore cancelled items when determining mixed status
  if (pendingCount > 0) return 'pending';
  if (confirmedCount > 0) return 'confirmed';
  if (preparingCount > 0) return 'preparing';
  if (readyCount > 0) return 'ready';
  
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

  // Cannot cancel served or completed items/orders
  if (newStatus === 'cancelled') {
    // Allow cancelling only from pending or confirmed
    return ['pending', 'confirmed'].includes(currentStatus as ItemStatus | OrderStatus);
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
 * Order can only be completed when all items are served (order status is 'served')
 */
export const canCompleteOrder = (items: Array<{ status: ItemStatus }>): boolean => {
  return items.length > 0 && items.every(item => item.status === 'served');
};

/**
 * Checks if an order can be cancelled
 * Order can be cancelled if not already completed, cancelled, or if any items are served
 */
export const canCancelOrder = (orderStatus: OrderStatus, items?: Array<{ status: ItemStatus }>): boolean => {
  // Cannot cancel if order is already completed or cancelled
  if (['completed', 'cancelled'].includes(orderStatus)) {
    return false;
  }
  
  // Cannot cancel if any items are served
  if (items && items.some(item => item.status === 'served')) {
    return false;
  }
  
  return true;
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
