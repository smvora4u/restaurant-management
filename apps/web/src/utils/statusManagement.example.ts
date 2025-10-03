/**
 * Example usage of the centralized status management system
 * This demonstrates how order and item statuses stay in sync
 */

import { syncOrderStatus, calculateOrderStatus, getItemStatusSummary } from './statusManagement';

// Example: Order with mixed item statuses
const exampleOrder = {
  id: 'order_123',
  status: 'pending' as const,
  items: [
    { menuItemId: 'pizza_1', quantity: 2, price: 15.99, status: 'pending' as const },
    { menuItemId: 'burger_1', quantity: 1, price: 12.99, status: 'preparing' as const },
    { menuItemId: 'salad_1', quantity: 1, price: 8.99, status: 'ready' as const }
  ]
};

// Calculate what the order status should be based on item statuses
const calculatedStatus = calculateOrderStatus(exampleOrder.items);
console.log('Calculated order status:', calculatedStatus); // 'preparing' (most advanced status)

// Get status summary
const summary = getItemStatusSummary(exampleOrder.items);
console.log('Status summary:', summary);
// Output: { total: 3, pending: 1, confirmed: 0, preparing: 1, ready: 1, served: 0, cancelled: 0 }

// Sync the order status
const syncedOrder = syncOrderStatus(exampleOrder);
console.log('Synced order status:', syncedOrder.status); // 'preparing'

// Example: All items served -> order completed
const completedOrder = {
  id: 'order_456',
  status: 'preparing' as const,
  items: [
    { menuItemId: 'pizza_1', quantity: 1, price: 15.99, status: 'served' as const },
    { menuItemId: 'burger_1', quantity: 1, price: 12.99, status: 'served' as const }
  ]
};

const syncedCompletedOrder = syncOrderStatus(completedOrder);
console.log('Completed order status:', syncedCompletedOrder.status); // 'completed'

// Example: Mixed statuses with some cancelled
const cancelledOrder = {
  id: 'order_789',
  status: 'preparing' as const,
  items: [
    { menuItemId: 'pizza_1', quantity: 1, price: 15.99, status: 'served' as const },
    { menuItemId: 'burger_1', quantity: 1, price: 12.99, status: 'cancelled' as const }
  ]
};

const syncedCancelledOrder = syncOrderStatus(cancelledOrder);
console.log('Cancelled order status:', syncedCancelledOrder.status); // 'pending' (not all cancelled)
