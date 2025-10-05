import { useEffect } from 'react';
import { useSubscription } from '@apollo/client';
import {
  ORDER_UPDATED_SUBSCRIPTION,
  ORDER_ITEM_STATUS_UPDATED_SUBSCRIPTION,
  NEW_ORDER_SUBSCRIPTION
} from '../graphql';

interface UseOrderSubscriptionsProps {
  restaurantId: string;
  onOrderUpdated?: (order: any) => void;
  onOrderItemStatusUpdated?: (order: any) => void;
  onNewOrder?: (order: any) => void;
}

export const useOrderSubscriptions = ({
  restaurantId,
  onOrderUpdated,
  onOrderItemStatusUpdated,
  onNewOrder
}: UseOrderSubscriptionsProps) => {
  console.log('Setting up subscriptions for restaurantId:', restaurantId);

  const { data: orderUpdatedData, error: orderUpdatedError } = useSubscription(ORDER_UPDATED_SUBSCRIPTION, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  const { data: orderItemStatusUpdatedData, error: orderItemStatusUpdatedError } = useSubscription(ORDER_ITEM_STATUS_UPDATED_SUBSCRIPTION, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  const { data: newOrderData, error: newOrderError } = useSubscription(NEW_ORDER_SUBSCRIPTION, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  // Log subscription errors
  if (orderUpdatedError) console.error('Order updated subscription error:', orderUpdatedError);
  if (orderItemStatusUpdatedError) console.error('Order item status updated subscription error:', orderItemStatusUpdatedError);
  if (newOrderError) console.error('New order subscription error:', newOrderError);

  useEffect(() => {
    if (orderUpdatedData?.orderUpdated && onOrderUpdated) {
      console.log('Order updated received:', orderUpdatedData.orderUpdated);
      onOrderUpdated(orderUpdatedData.orderUpdated);
    }
  }, [orderUpdatedData, onOrderUpdated]);

  useEffect(() => {
    if (orderItemStatusUpdatedData?.orderItemStatusUpdated && onOrderItemStatusUpdated) {
      console.log('Order item status updated received:', orderItemStatusUpdatedData.orderItemStatusUpdated);
      onOrderItemStatusUpdated(orderItemStatusUpdatedData.orderItemStatusUpdated);
    }
  }, [orderItemStatusUpdatedData, onOrderItemStatusUpdated]);

  useEffect(() => {
    if (newOrderData?.newOrder && onNewOrder) {
      console.log('New order received:', newOrderData.newOrder);
      onNewOrder(newOrderData.newOrder);
    }
  }, [newOrderData, onNewOrder]);
};
