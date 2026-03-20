import { useState, useCallback } from 'react';
import { useMutation, useApolloClient } from '@apollo/client';
import { UPDATE_ORDER } from '../graphql/mutations/orders';
import { GET_ORDER_BY_ID } from '../graphql/queries/orders';
import { isValidStatusTransition, getNextStatus } from '../utils/statusManagement';
import { OrderStatus } from '../utils/statusColors';

interface UseOrderStatusProps {
  orderId: string;
  order?: any; // Add order data for auto-detach functionality
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useOrderStatus = ({ orderId, order, onSuccess, onError }: UseOrderStatusProps) => {
  const apolloClient = useApolloClient();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [updateOrderStatus] = useMutation(UPDATE_ORDER, {
    onCompleted: () => {
      setIsUpdating(false);
      setStatusDialogOpen(false);
      setNewStatus('');
      onSuccess?.();
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
            totalAmount: order.totalAmount,
            version: order.version ?? 1
          }
        }
      });
    } catch (error) {
      setIsUpdating(false);
      onError?.(error);
      console.error('Error updating order status:', error);
      throw error;
    }
  }, [orderId, newStatus, order, updateOrderStatus, onError]);

  const handleCompleteOrder = useCallback(async (overrideItems?: any[]) => {
    if (!order) {
      onError?.(new Error('Order data not available'));
      return;
    }

    setIsUpdating(true);
    
    try {
      const restaurantId = getEffectiveRestaurantId();
      const itemsToUse = overrideItems ?? order.items;

      const buildCompleteInput = (orderSource: any, itemsSource: any[]) => {
        const isTakeoutOrDeliverySource = orderSource.orderType === 'takeout' || orderSource.orderType === 'delivery';
        const normalizedItems = itemsSource.map((item: any) => ({
          menuItemId: typeof item.menuItemId === 'string' ? item.menuItemId : item.menuItemId?.id,
          quantity: item.quantity,
          price: item.price,
          status: isTakeoutOrDeliverySource ? 'served' : item.status,
          specialInstructions: item.specialInstructions
        }));
        const computedTotalAmount = normalizedItems.reduce((sum: number, i: any) => sum + (i.price || 0) * (i.quantity || 0), 0);
        const detachTable = orderSource.orderType === 'dine-in' && orderSource.tableNumber;
        return {
          restaurantId,
          status: 'completed',
          tableNumber: detachTable ? null : (orderSource.tableNumber != null ? String(orderSource.tableNumber) : null),
          orderType: orderSource.orderType,
          customerName: orderSource.customerName,
          customerPhone: orderSource.customerPhone,
          notes: orderSource.notes,
          sessionId: orderSource.sessionId,
          userId: orderSource.userId,
          items: normalizedItems,
          totalAmount: computedTotalAmount,
          version: orderSource.version ?? 1
        };
      };

      try {
        await updateOrderStatus({
          variables: {
            id: orderId,
            input: buildCompleteInput(order, itemsToUse)
          }
        });
      } catch (error: any) {
        let attemptError: any = error;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const message = attemptError?.message || '';
          if (!message.includes('modified by another user')) {
            throw attemptError;
          }
          const latestResult = await apolloClient.query({
            query: GET_ORDER_BY_ID,
            variables: { id: orderId },
            fetchPolicy: 'network-only'
          });
          const latestOrder = latestResult?.data?.order;
          if (!latestOrder) {
            throw attemptError;
          }
          try {
            await updateOrderStatus({
              variables: {
                id: orderId,
                input: buildCompleteInput(latestOrder, latestOrder.items || itemsToUse)
              }
            });
            attemptError = null;
            break;
          } catch (retryError: any) {
            attemptError = retryError;
          }
        }
        if (attemptError) {
          throw attemptError;
        }
      }
    } catch (error) {
      setIsUpdating(false);
      onError?.(error);
      console.error('Error completing order:', error);
      throw error;
    }
  }, [orderId, order, updateOrderStatus, onError, apolloClient]);

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
            totalAmount: order.totalAmount,
            version: order.version ?? 1
          }
        }
      });
    } catch (error) {
      setIsUpdating(false);
      onError?.(error);
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
