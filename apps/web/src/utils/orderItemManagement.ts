/**
 * Utility functions for managing order items with quantity-wise status tracking
 */

import { ItemStatus } from './statusColors';

export interface OrderItem {
  menuItemId: string | { id: string; name?: string };
  quantity: number;
  price: number;
  status: ItemStatus;
  specialInstructions?: string;
}

/**
 * Handles quantity changes with status-aware merging
 * Implements Option 1 with Option A (merge same status, separate different status)
 * @param orderType - When 'takeout' or 'delivery', adding to served item keeps served status
 */
export const handleQuantityChange = (
  items: OrderItem[],
  index: number,
  newQuantity: number,
  orderType?: string
): OrderItem[] => {
  if (newQuantity < 0) return items;
  
  const currentItem = items[index];
  const oldQuantity = currentItem.quantity;
  
  // If quantity unchanged, return items as-is
  if (newQuantity === oldQuantity) {
    return items;
  }
  
  // If quantity is being decreased, simply update the quantity
  if (newQuantity < oldQuantity) {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity
    };
    return updatedItems;
  }
  
  // If quantity is being increased
  if (newQuantity > oldQuantity) {
    const quantityDiff = newQuantity - oldQuantity;
    const menuItemId = typeof currentItem.menuItemId === 'string' 
      ? currentItem.menuItemId 
      : currentItem.menuItemId?.id;
    
    // If the current item is already pending, just update its quantity
    if (currentItem.status === 'pending') {
      const updatedItems = [...items];
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: newQuantity
      };
      return updatedItems;
    }
    
    // If current item is NOT pending, create new item or merge with existing same-status item
    const normalizeInstructions = (instructions: any) => (instructions && instructions.trim()) || '';
    const currentInstructions = normalizeInstructions(currentItem.specialInstructions);
    // When adding to served item: takeout/delivery keeps served; dine-in uses pending (new order to kitchen)
    const isTakeoutOrDelivery = orderType === 'takeout' || orderType === 'delivery';
    const targetStatus = currentItem.status === 'served' && !isTakeoutOrDelivery
      ? 'pending'
      : currentItem.status;
    const existingIndex = items.findIndex((item, idx) => {
      const itemInstructions = normalizeInstructions(item.specialInstructions);
      return idx !== index &&
        (typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id) === menuItemId &&
        item.status === targetStatus &&
        itemInstructions === currentInstructions;
    });

    if (existingIndex !== -1) {
      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: updatedItems[existingIndex].quantity + quantityDiff
      };
      return updatedItems;
    } else {
      const newItem: OrderItem = {
        menuItemId: currentItem.menuItemId,
        quantity: quantityDiff,
        price: currentItem.price,
        status: targetStatus,
        specialInstructions: currentItem.specialInstructions
      };
      return [...items, newItem];
    }
  }
  
  return items;
};

/**
 * Adds a new item to the order, preserving the status from newItem.
 * For dine-in: typically 'pending'. For takeout/delivery: typically 'served'.
 */
export const addNewOrderItem = (
  items: OrderItem[],
  newItem: OrderItem
): OrderItem[] => {
  const menuItemId = typeof newItem.menuItemId === 'string' 
    ? newItem.menuItemId 
    : newItem.menuItemId?.id;
  const newItemStatus = newItem.status || 'pending';

  // Check if there's already an item for the same menuItemId, status, and special instructions
  const normalizeInstructions = (instructions: any) => (instructions && instructions.trim()) || '';
  const newItemInstructions = normalizeInstructions(newItem.specialInstructions);
  const existingIndex = items.findIndex((item) => {
    const itemInstructions = normalizeInstructions(item.specialInstructions);
    return (typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id) === menuItemId &&
      item.status === newItemStatus &&
      itemInstructions === newItemInstructions;
  });

  if (existingIndex !== -1) {
    const updatedItems = [...items];
    updatedItems[existingIndex] = {
      ...updatedItems[existingIndex],
      quantity: updatedItems[existingIndex].quantity + newItem.quantity
    };
    return updatedItems;
  } else {
    const itemToAdd: OrderItem = {
      ...newItem,
      status: newItemStatus
    };
    return [...items, itemToAdd];
  }
};

/**
 * Merges order items by status and menuItemId
 * Groups items with same menuItemId and status together
 */
export const mergeOrderItemsByStatus = (items: OrderItem[]): OrderItem[] => {
  const mergedMap = new Map<string, OrderItem>();
  
  items.forEach(item => {
    const menuItemId = typeof item.menuItemId === 'string' 
      ? item.menuItemId 
      : item.menuItemId?.id;
    // Normalize specialInstructions: undefined, null, or empty string all become empty string
    const normalizedInstructions = (item.specialInstructions && item.specialInstructions.trim()) || '';
    const key = `${menuItemId}-${item.status}-${normalizedInstructions}`;
    
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!;
      mergedMap.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity
      });
    } else {
      mergedMap.set(key, { ...item });
    }
  });
  
  return Array.from(mergedMap.values());
};

/**
 * Removes an item from the order items array
 */
export const removeOrderItem = (items: OrderItem[], index: number): OrderItem[] => {
  return items.filter((_, i) => i !== index);
};

/**
 * Updates the status of a specific order item and merges with items of the same status
 */
export const updateOrderItemStatusWithMerge = (
  items: OrderItem[],
  index: number,
  newStatus: ItemStatus
): OrderItem[] => {
  const currentItem = items[index];
  const menuItemId = typeof currentItem.menuItemId === 'string' 
    ? currentItem.menuItemId 
    : currentItem.menuItemId?.id;
  
  // Check if there's already an item with the same menuItemId, newStatus, and special instructions
  // Normalize specialInstructions for comparison
  const normalizeInstructions = (instructions: any) => (instructions && instructions.trim()) || '';
  const currentInstructions = normalizeInstructions(currentItem.specialInstructions);
  const existingSameStatusIndex = items.findIndex((item, idx) => {
    const itemInstructions = normalizeInstructions(item.specialInstructions);
    return idx !== index && 
      (typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id) === menuItemId &&
      item.status === newStatus &&
      itemInstructions === currentInstructions;
  });
  
  if (existingSameStatusIndex !== -1) {
    // Merge with existing item of the same status
    const updatedItems = [...items];
    updatedItems[existingSameStatusIndex] = {
      ...updatedItems[existingSameStatusIndex],
      quantity: updatedItems[existingSameStatusIndex].quantity + currentItem.quantity
    };
    // Remove the current item since it's been merged
    updatedItems.splice(index, 1);
    return updatedItems;
  } else {
    // Just update the status of the current item
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      status: newStatus
    };
    return updatedItems;
  }
};

/**
 * Updates the status of a partial quantity of an order item
 * Creates a new item with the new status and reduces the original item's quantity
 */
export const updatePartialQuantityStatus = (
  items: OrderItem[],
  index: number,
  newStatus: ItemStatus,
  quantityToUpdate: number
): OrderItem[] => {
  const currentItem = items[index];
  const remainingQuantity = currentItem.quantity - quantityToUpdate;
  
  if (remainingQuantity <= 0) {
    // If updating all quantity, just change the status
    return updateOrderItemStatusWithMerge(items, index, newStatus);
  }
  
  const menuItemId = typeof currentItem.menuItemId === 'string' 
    ? currentItem.menuItemId 
    : currentItem.menuItemId?.id;
  
  // Check if there's already an item with the same menuItemId, newStatus, and special instructions
  // Normalize specialInstructions for comparison
  const normalizeInstructions = (instructions: any) => (instructions && instructions.trim()) || '';
  const currentInstructions = normalizeInstructions(currentItem.specialInstructions);
  const existingSameStatusIndex = items.findIndex((item, idx) => {
    const itemInstructions = normalizeInstructions(item.specialInstructions);
    return idx !== index && 
      (typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id) === menuItemId &&
      item.status === newStatus &&
      itemInstructions === currentInstructions;
  });
  
  const updatedItems = [...items];
  
  // Update the original item's quantity
  updatedItems[index] = {
    ...updatedItems[index],
    quantity: remainingQuantity
  };
  
  if (existingSameStatusIndex !== -1) {
    // Merge with existing item of the same status
    updatedItems[existingSameStatusIndex] = {
      ...updatedItems[existingSameStatusIndex],
      quantity: updatedItems[existingSameStatusIndex].quantity + quantityToUpdate
    };
  } else {
    // Create new item with the new status
    const newItem: OrderItem = {
      menuItemId: currentItem.menuItemId,
      quantity: quantityToUpdate,
      price: currentItem.price,
      status: newStatus,
      specialInstructions: currentItem.specialInstructions
    };
    updatedItems.push(newItem);
  }
  
  return updatedItems;
};
