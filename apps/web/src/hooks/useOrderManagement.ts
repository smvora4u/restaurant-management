import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_ORDER } from '../graphql/mutations/orders';
import { handleQuantityChange, removeOrderItem, addNewOrderItem, updateOrderItemStatusWithMerge, updatePartialQuantityStatus, mergeOrderItemsByStatus } from '../utils/orderItemManagement';
import { calculateOrderStatus } from '../utils/statusManagement';

interface UseOrderManagementProps {
  orderId: string;
  originalOrder?: any;
  restaurantId?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  autoSave?: boolean; // Enable/disable auto-save (default: true)
  autoSaveDelay?: number; // Delay in milliseconds before auto-saving (default: 1000ms)
}

export const useOrderManagement = ({ 
  orderId, 
  originalOrder, 
  restaurantId, 
  onSuccess, 
  onError,
  autoSave = true,
  autoSaveDelay = 1000
}: UseOrderManagementProps) => {
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  const [updateOrder] = useMutation(UPDATE_ORDER, {
    onCompleted: () => {
      setIsSaving(false);
      setHasUnsavedChanges(false);
    },
    onError: (error) => {
      setIsSaving(false);
    }
  });

  const initializeEditing = useCallback((originalItems: any[]) => {
    // Merge any duplicate items with same status, menuItemId, and specialInstructions
    const mergedItems = mergeOrderItemsByStatus(originalItems);
    setEditingItems(mergedItems);
    setHasUnsavedChanges(false);
    isInitializedRef.current = true;
  }, []);

  const handleQuantityChangeWrapper = useCallback((index: number, newQuantity: number) => {
    setEditingItems(prev => {
      const updated = handleQuantityChange(prev, index, newQuantity);
      const merged = mergeOrderItemsByStatus(updated);
      setHasUnsavedChanges(true);
      return merged;
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setEditingItems(prev => {
      // Check if item status is not pending
      if (prev[index] && prev[index].status !== 'pending') {
        return prev; // Return unchanged items
      }
      
      const updated = removeOrderItem(prev, index);
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  const handleAddItems = useCallback((items: Array<{ menuItemId: string; quantity: number; specialInstructions: string; price: number }>) => {
    if (items.length === 0) return;
    setEditingItems(prev => {
      let updated = prev;
      for (const item of items) {
        const newItem = {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          status: 'pending' as const,
          specialInstructions: item.specialInstructions
        };
        updated = addNewOrderItem(updated, newItem);
      }
      updated = mergeOrderItemsByStatus(updated);
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  const handleAddItem = useCallback((menuItemId: string, quantity: number, specialInstructions: string, price: number) => {
    setEditingItems(prev => {
      const newItem = {
        menuItemId,
        quantity,
        price,
        status: 'pending' as const,
        specialInstructions
      };
      let updated = addNewOrderItem(prev, newItem);
      // Merge any duplicates that might have been created (safety check)
      updated = mergeOrderItemsByStatus(updated);
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  const handleUpdateItemStatus = useCallback((itemIndex: number, status: string, quantity?: number) => {
    setEditingItems(prev => {
      // Allow cancelling only from pending or confirmed
      if (status === 'cancelled' && !['pending', 'confirmed'].includes(prev[itemIndex]?.status)) {
        return prev; // no changes
      }
      
      let updated;
      if (quantity && quantity < prev[itemIndex].quantity) {
        // Use updatePartialQuantityStatus to handle partial quantity updates with merging
        updated = updatePartialQuantityStatus(prev, itemIndex, status as any, quantity);
      } else {
        // Use updateOrderItemStatusWithMerge to merge with existing items of same status
        updated = updateOrderItemStatusWithMerge(prev, itemIndex, status as any);
      }
      
      // Merge any duplicates that might have been created
      updated = mergeOrderItemsByStatus(updated);
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  const saveChanges = useCallback(async (silent = false) => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    
    try {
      // Calculate new order status based on items
      const newOrderStatus = calculateOrderStatus(editingItems);
      
      // Calculate new total amount
      const newTotalAmount = editingItems.reduce((total, item) => total + (item.price * item.quantity), 0);

      // Clean items to remove __typename and other Apollo Client fields
      // Normalize menuItemId (Apollo may return populated object)
      const cleanItems = editingItems.map(item => ({
        menuItemId: typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id,
        quantity: item.quantity,
        price: item.price,
        status: item.status,
        specialInstructions: item.specialInstructions
      }));

      await updateOrder({
        variables: {
          id: orderId,
          input: {
            restaurantId: restaurantId || originalOrder?.restaurantId || originalOrder?.restaurant?.id,
            orderType: originalOrder?.orderType,
            tableNumber: originalOrder?.tableNumber,
            items: cleanItems,
            status: newOrderStatus,
            totalAmount: newTotalAmount,
            customerName: originalOrder?.customerName,
            customerPhone: originalOrder?.customerPhone,
            notes: originalOrder?.notes,
            sessionId: originalOrder?.sessionId,
            userId: originalOrder?.userId
          }
        }
      });
      
      // Always call onSuccess to refetch data, but pass silent flag to control notifications
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving order changes:', error);
      // Only show error notification if not silent (manual save)
      if (!silent && onError) {
        onError(error);
      }
      throw error;
    }
  }, [orderId, editingItems, hasUnsavedChanges, updateOrder, originalOrder, restaurantId, onSuccess, onError]);

  // Use ref to avoid dependency issues with saveChanges
  const saveChangesRef = useRef(saveChanges);
  useEffect(() => {
    saveChangesRef.current = saveChanges;
  }, [saveChanges]);

  // Auto-save effect: automatically save changes after a delay
  useEffect(() => {
    // Don't auto-save if:
    // - Auto-save is disabled
    // - There are no unsaved changes
    // - Currently saving
    // - Not yet initialized (to avoid saving on initial load)
    if (!autoSave || !hasUnsavedChanges || isSaving || !isInitializedRef.current) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (100ms delay to debounce rapid changes)
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveChangesRef.current(true); // Silent save using ref to avoid dependency issues
    }, 100);

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editingItems, autoSave, hasUnsavedChanges, isSaving, autoSaveDelay]);

  const canCompleteOrder = useCallback((currentStatus: string) => {
    return currentStatus === 'ready' || currentStatus === 'served';
  }, []);

  const canCancelOrder = useCallback((currentStatus: string) => {
    return ['pending', 'confirmed', 'preparing'].includes(currentStatus);
  }, []);

  const syncFromExternal = useCallback((items: any[]) => {
    const mergedItems = mergeOrderItemsByStatus(items);
    setEditingItems(mergedItems);
    setHasUnsavedChanges(false);
    isInitializedRef.current = true;
  }, []);

  return {
    editingItems,
    hasUnsavedChanges,
    isSaving,
    initializeEditing,
    handleQuantityChange: handleQuantityChangeWrapper,
    handleRemoveItem,
    handleAddItem,
    handleAddItems,
    handleUpdateItemStatus,
    syncFromExternal,
    saveChanges,
    canCompleteOrder,
    canCancelOrder
  };
};
