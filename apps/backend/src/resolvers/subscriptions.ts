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
export const FEE_LEDGER_UPDATED = 'FEE_LEDGER_UPDATED';
export const PAYMENT_STATUS_UPDATED = 'PAYMENT_STATUS_UPDATED';
export const DUE_FEES_UPDATED = 'DUE_FEES_UPDATED';
export const PLATFORM_ANALYTICS_UPDATED = 'PLATFORM_ANALYTICS_UPDATED';

export const subscriptionResolvers = {
  Subscription: {
    orderUpdated: {
      subscribe: withFilter(
        () => {
          console.log('New subscription to orderUpdated');
          return pubsub.asyncIterator([ORDER_UPDATED]);
        },
        (payload: IOrder, variables: { restaurantId: string }) => {
          // Convert both to strings for comparison (handle ObjectId and string)
          const payloadRestaurantId = payload.restaurantId?.toString();
          const variableRestaurantId = variables.restaurantId?.toString();
          const matches = payloadRestaurantId === variableRestaurantId;
          if (!matches) {
            console.log(`Filtering out order update - RestaurantId mismatch: ${payloadRestaurantId} !== ${variableRestaurantId}`);
          }
          return matches;
        }
      ),
      resolve: (payload: IOrder) => payload,
    },
    orderItemStatusUpdated: {
      subscribe: withFilter(
        () => {
          console.log('New subscription to orderItemStatusUpdated');
          return pubsub.asyncIterator([ORDER_ITEM_STATUS_UPDATED]);
        },
        (payload: IOrder, variables: { restaurantId: string }) => {
          // Convert both to strings for comparison (handle ObjectId and string)
          const payloadRestaurantId = payload.restaurantId?.toString();
          const variableRestaurantId = variables.restaurantId?.toString();
          const matches = payloadRestaurantId === variableRestaurantId;
          if (!matches) {
            console.log(`Filtering out order item status update - RestaurantId mismatch: ${payloadRestaurantId} !== ${variableRestaurantId}`);
          }
          return matches;
        }
      ),
      resolve: (payload: IOrder) => payload,
    },
    newOrder: {
      subscribe: withFilter(
        () => {
          console.log('New subscription to newOrder');
          return pubsub.asyncIterator([NEW_ORDER]);
        },
        (payload: IOrder, variables: { restaurantId: string }) => {
          // Convert both to strings for comparison (handle ObjectId and string)
          const payloadRestaurantId = payload.restaurantId?.toString();
          const variableRestaurantId = variables.restaurantId?.toString();
          const matches = payloadRestaurantId === variableRestaurantId;
          if (!matches) {
            console.log(`Filtering out new order - RestaurantId mismatch: ${payloadRestaurantId} !== ${variableRestaurantId}`);
          }
          return matches;
        }
      ),
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
    },
    feeLedgerUpdated: {
      subscribe: () => pubsub.asyncIterator([FEE_LEDGER_UPDATED]),
      resolve: (payload: any) => payload
    },
    paymentStatusUpdated: {
      subscribe: () => pubsub.asyncIterator([PAYMENT_STATUS_UPDATED]),
      resolve: (payload: any) => payload
    },
    dueFeesUpdated: {
      subscribe: () => pubsub.asyncIterator([DUE_FEES_UPDATED]),
      resolve: (payload: any) => payload
    }
  },
};

// Helper function to convert Mongoose order document to plain object with id field
const convertOrderToPlainObject = (order: any) => {
  // Convert Mongoose document to plain object if it has toObject method
  let orderObj: any;
  if (order && typeof order.toObject === 'function') {
    orderObj = order.toObject();
  } else {
    orderObj = { ...order };
  }
  
  // Get the id from _id or existing id field
  const orderId = order._id?.toString() || order.id || orderObj._id?.toString() || orderObj.id;
  const restaurantId = order.restaurantId?.toString() || orderObj.restaurantId?.toString();
  
  // Build the order data with proper id field
  const orderData: any = {
    ...orderObj,
    id: orderId,
    restaurantId: restaurantId
  };
  
  // Remove _id field if it exists to avoid confusion
  if (orderData._id !== undefined) {
    delete orderData._id;
  }
  
  return orderData;
};

export const publishOrderUpdated = async (order: IOrder) => {
  // Ensure restaurantId is a string for consistent comparison in subscriptions
  const restaurantIdStr = order.restaurantId?.toString();
  console.log('Publishing order updated event for restaurant:', restaurantIdStr);
  const orderData = convertOrderToPlainObject(order);
  await pubsub.publish(ORDER_UPDATED, orderData);
};

export const publishFeeLedgerUpdated = async (feeLedger: any) => {
  console.log('Publishing fee ledger updated event for restaurant:', feeLedger.restaurantId);
  await pubsub.publish(FEE_LEDGER_UPDATED, feeLedger);
};

export const publishPaymentStatusUpdated = async (feeLedger: any) => {
  console.log('Publishing payment status updated event for restaurant:', feeLedger.restaurantId);
  await pubsub.publish(PAYMENT_STATUS_UPDATED, feeLedger);
};

export const publishDueFeesUpdated = async (restaurantId: string) => {
  console.log('Publishing due fees updated event for restaurant:', restaurantId);
  
  // Import FeeLedger model to calculate due fees
  const { FeeLedger } = await import('../models/index.js');
  
  // Calculate current due fees for the restaurant
  const pendingFees = await FeeLedger.find({ 
    restaurantId, 
    paymentStatus: 'pending' 
  });
  
  const totalDueFees = pendingFees.reduce((sum, fee) => sum + fee.feeAmount, 0);
  
  const dueFeesUpdate = {
    restaurantId,
    totalDueFees,
    pendingCount: pendingFees.length,
    updatedAt: new Date().toISOString()
  };
  
  await pubsub.publish(DUE_FEES_UPDATED, dueFeesUpdate);
};

export const publishOrderItemStatusUpdated = async (order: IOrder) => {
  // Ensure restaurantId is a string for consistent comparison in subscriptions
  const restaurantIdStr = order.restaurantId?.toString();
  console.log('Publishing order item status updated event for restaurant:', restaurantIdStr);
  const orderData = convertOrderToPlainObject(order);
  await pubsub.publish(ORDER_ITEM_STATUS_UPDATED, orderData);
};

export const publishNewOrder = async (order: IOrder) => {
  // Ensure restaurantId is a string for consistent comparison in subscriptions
  const restaurantIdStr = order.restaurantId?.toString();
  console.log('Publishing new order event for restaurant:', restaurantIdStr);
  const orderData = convertOrderToPlainObject(order);
  await pubsub.publish(NEW_ORDER, orderData);
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
