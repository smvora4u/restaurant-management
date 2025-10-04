import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_ORDER } from '../graphql/mutations/orders';
import { handleQuantityChange, removeOrderItem, addNewOrderItem } from '../utils/orderItemManagement';
import { syncOrderStatus, calculateOrderStatus } from '../utils/statusManagement';

interface UseOrderManagementProps {
  orderId: string;
  originalOrder?: any;
  restaurantId?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useOrderManagement = ({ orderId, originalOrder, restaurantId, onSuccess, onError }: UseOrderManagementProps) => {
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [updateOrder] = useMutation(UPDATE_ORDER, {
    onCompleted: () => {
      setIsSaving(false);
      setHasUnsavedChanges(false);
      onSuccess?.();
    },
    onError: (error) => {
      setIsSaving(false);
      onError?.(error);
    }
  });

  const initializeEditing = useCallback((originalItems: any[]) => {
    setEditingItems([...originalItems]);
    setHasUnsavedChanges(false);
  }, []);

  const handleQuantityChangeWrapper = useCallback((index: number, newQuantity: number) => {
    setEditingItems(prev => {
      const updated = handleQuantityChange(prev, index, newQuantity);
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setEditingItems(prev => {
      const updated = removeOrderItem(prev, index);
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
      const updated = addNewOrderItem(prev, newItem);
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  const handleUpdateItemStatus = useCallback((itemIndex: number, status: string, quantity?: number) => {
    setEditingItems(prev => {
      const updated = [...prev];
      if (quantity && quantity < updated[itemIndex].quantity) {
        // Split the item if updating partial quantity
        const remainingQuantity = updated[itemIndex].quantity - quantity;
        updated[itemIndex] = { ...updated[itemIndex], quantity, status };
        
        // Add remaining quantity as separate item with original status
        updated.splice(itemIndex + 1, 0, {
          ...updated[itemIndex],
          quantity: remainingQuantity,
          status: prev[itemIndex].status
        });
      } else {
        updated[itemIndex] = { ...updated[itemIndex], status };
      }
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  const saveChanges = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    
    try {
      // Calculate new order status based on items
      const newOrderStatus = calculateOrderStatus(editingItems);
      
      // Calculate new total amount
      const newTotalAmount = editingItems.reduce((total, item) => total + (item.price * item.quantity), 0);

      // Clean items to remove __typename and other Apollo Client fields
      const cleanItems = editingItems.map(item => ({
        menuItemId: item.menuItemId,
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
    } catch (error) {
      console.error('Error saving order changes:', error);
      throw error;
    }
  }, [orderId, editingItems, hasUnsavedChanges, updateOrder, originalOrder, restaurantId]);

  const canCompleteOrder = useCallback((currentStatus: string) => {
    return currentStatus === 'ready' || currentStatus === 'served';
  }, []);

  const canCancelOrder = useCallback((currentStatus: string) => {
    return ['pending', 'confirmed', 'preparing'].includes(currentStatus);
  }, []);

  return {
    editingItems,
    hasUnsavedChanges,
    isSaving,
    initializeEditing,
    handleQuantityChange: handleQuantityChangeWrapper,
    handleRemoveItem,
    handleAddItem,
    handleUpdateItemStatus,
    saveChanges,
    canCompleteOrder,
    canCancelOrder
  };
};
