import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import { IOrder } from '../types/index.js';

// Create a new PubSub instance
export const pubsub = new PubSub();

export const ORDER_UPDATED = 'ORDER_UPDATED';
export const ORDER_ITEM_STATUS_UPDATED = 'ORDER_ITEM_STATUS_UPDATED';
export const NEW_ORDER = 'NEW_ORDER';
export const AUDIT_LOG_CREATED = 'AUDIT_LOG_CREATED';
export const RESTAURANT_UPDATED = 'RESTAURANT_UPDATED';
export const STAFF_UPDATED = 'STAFF_UPDATED';
export const PLATFORM_ANALYTICS_UPDATED = 'PLATFORM_ANALYTICS_UPDATED';

export const subscriptionResolvers = {
  Subscription: {
    orderUpdated: {
      subscribe: () => {
        console.log('New subscription to orderUpdated');
        return pubsub.asyncIterator([ORDER_UPDATED]);
      },
      resolve: (payload: IOrder) => payload,
    },
    orderItemStatusUpdated: {
      subscribe: () => {
        console.log('New subscription to orderItemStatusUpdated');
        return pubsub.asyncIterator([ORDER_ITEM_STATUS_UPDATED]);
      },
      resolve: (payload: IOrder) => payload,
    },
    newOrder: {
      subscribe: () => {
        console.log('New subscription to newOrder');
        return pubsub.asyncIterator([NEW_ORDER]);
      },
      resolve: (payload: IOrder) => payload,
    },
    auditLogCreated: {
      subscribe: () => pubsub.asyncIterator([AUDIT_LOG_CREATED])
    },
    restaurantUpdated: {
      subscribe: () => pubsub.asyncIterator([RESTAURANT_UPDATED])
    },
    staffUpdated: {
      subscribe: () => pubsub.asyncIterator([STAFF_UPDATED])
    },
    platformAnalyticsUpdated: {
      subscribe: () => pubsub.asyncIterator([PLATFORM_ANALYTICS_UPDATED])
    }
  },
};

export const publishOrderUpdated = async (order: IOrder) => {
  console.log('Publishing order updated event for restaurant:', order.restaurantId);
  await pubsub.publish(ORDER_UPDATED, order);
};

export const publishOrderItemStatusUpdated = async (order: IOrder) => {
  console.log('Publishing order item status updated event for restaurant:', order.restaurantId);
  await pubsub.publish(ORDER_ITEM_STATUS_UPDATED, order);
};

export const publishNewOrder = async (order: IOrder) => {
  console.log('Publishing new order event for restaurant:', order.restaurantId);
  await pubsub.publish(NEW_ORDER, order);
};

export const publishAuditLogCreated = async (log: any) => {
  await pubsub.publish(AUDIT_LOG_CREATED, log);
};

export const publishRestaurantUpdated = async (restaurant: any) => {
  await pubsub.publish(RESTAURANT_UPDATED, restaurant);
};

export const publishStaffUpdated = async (staff: any) => {
  await pubsub.publish(STAFF_UPDATED, staff);
};

export const publishPlatformAnalyticsUpdated = async (analytics: any) => {
  await pubsub.publish(PLATFORM_ANALYTICS_UPDATED, analytics);
};
