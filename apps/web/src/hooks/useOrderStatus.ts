import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_ORDER } from '../graphql/mutations/orders';
import { isValidStatusTransition, getNextStatus } from '../utils/statusManagement';
import { OrderStatus } from '../utils/statusColors';

interface UseOrderStatusProps {
  orderId: string;
  order?: any; // Add order data for auto-detach functionality
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useOrderStatus = ({ orderId, order, onSuccess, onError }: UseOrderStatusProps) => {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [updateOrderStatus] = useMutation(UPDATE_ORDER, {
    onCompleted: () => {
      setIsUpdating(false);
      setStatusDialogOpen(false);
      setNewStatus('');
      onSuccess?.();
    },
    onError: (error) => {
      setIsUpdating(false);
      onError?.(error);
    }
  });

  // Resolve restaurant id from order or local storage as a fallback
  const getEffectiveRestaurantId = (): string | undefined => {
    if (order?.restaurantId) return order.restaurantId;
    try {
      const restaurantRaw = localStorage.getItem('restaurant');
      if (restaurantRaw) {
        const r = JSON.parse(restaurantRaw);
        if (r?.id) return r.id as string;
      }
      const staffRaw = localStorage.getItem('staff');
      if (staffRaw) {
        const s = JSON.parse(staffRaw);
        if (s?.restaurantId) return s.restaurantId as string;
      }
    } catch {}
    return undefined;
  };

  const openStatusDialog = useCallback((currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus as OrderStatus);
    setNewStatus(nextStatus || currentStatus);
    setStatusDialogOpen(true);
  }, []);

  const handleStatusUpdate = useCallback(async (currentStatus: string) => {
    if (!newStatus || !isValidStatusTransition(currentStatus as OrderStatus, newStatus as OrderStatus)) {
      onError?.(new Error('Invalid status transition'));
      return;
    }

    if (!order) {
      onError?.(new Error('Order data not available'));
      return;
    }

    setIsUpdating(true);
    
    try {
      // Auto-detach table when order is completed
      const shouldDetachTable = newStatus === 'completed' && order.orderType === 'dine-in' && order.tableNumber;
      const restaurantId = getEffectiveRestaurantId();
      
      await updateOrderStatus({
        variables: {
          id: orderId,
          input: {
            restaurantId,
            status: newStatus,
            tableNumber: shouldDetachTable ? null : (order.tableNumber != null ? String(order.tableNumber) : null), // Detach table if completing dine-in order
            orderType: order.orderType,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            notes: order.notes,
            sessionId: order.sessionId,
            userId: order.userId,
            items: order.items.map((item: any) => ({
              menuItemId: typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id,
              quantity: item.quantity,
              price: item.price,
              status: item.status,
              specialInstructions: item.specialInstructions
            })),
            totalAmount: order.totalAmount
          }
        }
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }, [orderId, newStatus, order, updateOrderStatus, onError]);

  const handleCompleteOrder = useCallback(async () => {
    if (!order) {
      onError?.(new Error('Order data not available'));
      return;
    }

    setIsUpdating(true);
    
    try {
      // Auto-detach table when completing dine-in order
      const shouldDetachTable = order.orderType === 'dine-in' && order.tableNumber;
      const restaurantId = getEffectiveRestaurantId();
      
      await updateOrderStatus({
        variables: {
          id: orderId,
          input: {
            restaurantId,
            status: 'completed',
            tableNumber: shouldDetachTable ? null : (order.tableNumber != null ? String(order.tableNumber) : null), // Detach table if completing dine-in order
            orderType: order.orderType,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            notes: order.notes,
            sessionId: order.sessionId,
            userId: order.userId,
            items: order.items.map((item: any) => ({
              menuItemId: typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id,
              quantity: item.quantity,
              price: item.price,
              status: item.status,
              specialInstructions: item.specialInstructions
            })),
            totalAmount: order.totalAmount
          }
        }
      });
    } catch (error) {
      console.error('Error completing order:', error);
      throw error;
    }
  }, [orderId, order, updateOrderStatus, onError]);

  const handleCancelOrder = useCallback(async () => {
    if (!order) {
      onError?.(new Error('Order data not available'));
      return;
    }

    setIsUpdating(true);
    
    try {
      // Auto-detach table when canceling dine-in order
      const shouldDetachTable = order.orderType === 'dine-in' && order.tableNumber;
      const restaurantId = getEffectiveRestaurantId();
      await updateOrderStatus({
        variables: {
          id: orderId,
          input: {
            restaurantId,
            status: 'cancelled',
            tableNumber: shouldDetachTable ? null : (order.tableNumber != null ? String(order.tableNumber) : null), // Detach table if canceling dine-in order
            orderType: order.orderType,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            notes: order.notes,
            sessionId: order.sessionId,
            userId: order.userId,
            items: order.items.map((item: any) => ({
              menuItemId: typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id,
              quantity: item.quantity,
              price: item.price,
              status: item.status,
              specialInstructions: item.specialInstructions
            })),
            totalAmount: order.totalAmount
          }
        }
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }, [orderId, order, updateOrderStatus, onError]);

  return {
    statusDialogOpen,
    newStatus,
    isUpdating,
    setStatusDialogOpen,
    setNewStatus,
    openStatusDialog,
    handleStatusUpdate,
    handleCompleteOrder,
    handleCancelOrder
  };
};
