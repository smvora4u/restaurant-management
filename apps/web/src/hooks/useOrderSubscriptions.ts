import { useEffect, useRef } from 'react';
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

  // Use refs to store callbacks to avoid recreating effects when callbacks change
  const onOrderUpdatedRef = useRef(onOrderUpdated);
  const onOrderItemStatusUpdatedRef = useRef(onOrderItemStatusUpdated);
  const onNewOrderRef = useRef(onNewOrder);

  // Update refs when callbacks change
  useEffect(() => {
    onOrderUpdatedRef.current = onOrderUpdated;
  }, [onOrderUpdated]);

  useEffect(() => {
    onOrderItemStatusUpdatedRef.current = onOrderItemStatusUpdated;
  }, [onOrderItemStatusUpdated]);

  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  }, [onNewOrder]);

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

  // Use refs in effects to avoid dependency on callback functions
  useEffect(() => {
    if (orderUpdatedData?.orderUpdated && onOrderUpdatedRef.current) {
      console.log('Order updated received:', orderUpdatedData.orderUpdated);
      onOrderUpdatedRef.current(orderUpdatedData.orderUpdated);
    }
  }, [orderUpdatedData]); // Only depend on data, not callback

  useEffect(() => {
    if (orderItemStatusUpdatedData?.orderItemStatusUpdated && onOrderItemStatusUpdatedRef.current) {
      console.log('Order item status updated received:', orderItemStatusUpdatedData.orderItemStatusUpdated);
      onOrderItemStatusUpdatedRef.current(orderItemStatusUpdatedData.orderItemStatusUpdated);
    }
  }, [orderItemStatusUpdatedData]); // Only depend on data, not callback

  useEffect(() => {
    if (newOrderData?.newOrder && onNewOrderRef.current) {
      console.log('New order received:', newOrderData.newOrder);
      onNewOrderRef.current(newOrderData.newOrder);
    }
  }, [newOrderData]); // Only depend on data, not callback
};
