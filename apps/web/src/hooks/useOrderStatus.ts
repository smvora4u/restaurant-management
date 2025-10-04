import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_ORDER } from '../graphql/mutations/orders';
import { isValidStatusTransition, getNextStatus } from '../utils/statusManagement';
import { OrderStatus } from '../utils/statusColors';

interface UseOrderStatusProps {
  orderId: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useOrderStatus = ({ orderId, onSuccess, onError }: UseOrderStatusProps) => {
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

    setIsUpdating(true);
    
    try {
      await updateOrderStatus({
        variables: {
          id: orderId,
          input: {
            status: newStatus
          }
        }
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }, [orderId, newStatus, updateOrderStatus, onError]);

  const handleCompleteOrder = useCallback(async () => {
    setIsUpdating(true);
    
    try {
      await updateOrderStatus({
        variables: {
          id: orderId,
          input: {
            status: 'completed'
          }
        }
      });
    } catch (error) {
      console.error('Error completing order:', error);
      throw error;
    }
  }, [orderId, updateOrderStatus]);

  const handleCancelOrder = useCallback(async () => {
    setIsUpdating(true);
    
    try {
      await updateOrderStatus({
        variables: {
          id: orderId,
          input: {
            status: 'cancelled'
          }
        }
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }, [orderId, updateOrderStatus]);

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
