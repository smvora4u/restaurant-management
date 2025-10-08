import { Staff, Order, MenuItem } from '../models/index.js';
import { ORDER_STATUSES, ORDER_ITEM_STATUSES, OrderItemStatus } from '../constants/orderStatuses.js';
import { publishOrderItemStatusUpdated, publishOrderUpdated } from './subscriptions.js';

export const staffManagementResolvers = {
  Query: {
    staffByRestaurant: async (_: any, { restaurantId }: { restaurantId: string }) => {
      try {
        const staff = await Staff.find({ restaurantId, isActive: true });
        return staff.map(s => ({
          id: s._id,
          name: s.name,
          email: s.email,
          role: s.role,
          permissions: s.permissions,
          restaurantId: s.restaurantId,
          isActive: s.isActive,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        }));
      } catch (error) {
        throw new Error(`Failed to fetch staff: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    staffById: async (_: any, { id }: { id: string }) => {
      try {
        const staff = await Staff.findById(id);
        if (!staff) {
          throw new Error('Staff not found');
        }
        return {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          permissions: staff.permissions,
          restaurantId: staff.restaurantId,
          isActive: staff.isActive,
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt
        };
      } catch (error) {
        throw new Error(`Failed to fetch staff: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    // Staff-specific order queries
    ordersForStaff: async (_: any, { restaurantId }: { restaurantId: string }) => {
      try {
        const orders = await Order.find({ restaurantId })
          .sort({ createdAt: -1 })
          .limit(50); // Limit to recent orders for performance
        
        return orders.map(order => ({
          id: order._id,
          tableNumber: order.tableNumber,
          orderType: order.orderType,
          items: order.items,
          status: order.status,
          totalAmount: order.totalAmount,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          notes: order.notes,
          sessionId: order.sessionId,
          userId: order.userId,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        }));
      } catch (error) {
        throw new Error(`Failed to fetch orders: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    orderByIdForStaff: async (_: any, { id }: { id: string }) => {
      try {
        const order = await Order.findById(id);
        if (!order) {
          throw new Error('Order not found');
        }
        return {
          id: order._id,
          tableNumber: order.tableNumber,
          orderType: order.orderType,
          items: order.items,
          status: order.status,
          totalAmount: order.totalAmount,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          notes: order.notes,
          sessionId: order.sessionId,
          userId: order.userId,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        };
      } catch (error) {
        throw new Error(`Failed to fetch order: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  },

  Mutation: {
    // Staff-specific order mutations
    updateOrderStatusForStaff: async (_: any, { id, status }: { id: string; status: string }) => {
      try {
        if (!ORDER_STATUSES.includes(status as any)) {
          throw new Error('Invalid order status');
        }

        const order = await Order.findByIdAndUpdate(
          id,
          { status, updatedAt: new Date() },
          { new: true }
        );

        if (!order) {
          throw new Error('Order not found');
        }

        // Publish order updated event
        await publishOrderUpdated(order);

        return {
          id: order._id,
          tableNumber: order.tableNumber,
          orderType: order.orderType,
          items: order.items,
          status: order.status,
          totalAmount: order.totalAmount,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          notes: order.notes,
          sessionId: order.sessionId,
          userId: order.userId,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        };
      } catch (error) {
        throw new Error(`Failed to update order status: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    updateOrderItemStatusForStaff: async (_: any, { orderId, itemIndex, status }: { orderId: string; itemIndex: number; status: string }) => {
      try {
        if (!ORDER_ITEM_STATUSES.includes(status as any)) {
          throw new Error('Invalid item status');
        }

        const order = await Order.findById(orderId);
        if (!order) {
          throw new Error('Order not found');
        }

        if (itemIndex < 0 || itemIndex >= order.items.length) {
          throw new Error('Invalid item index');
        }

        order.items[itemIndex]!.status = status as OrderItemStatus;
        order.updatedAt = new Date();
        await order.save();

        // Publish real-time update event
        await publishOrderItemStatusUpdated(order);

        return {
          id: order._id,
          tableNumber: order.tableNumber,
          orderType: order.orderType,
          items: order.items,
          status: order.status,
          totalAmount: order.totalAmount,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          notes: order.notes,
          sessionId: order.sessionId,
          userId: order.userId,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        };
      } catch (error) {
        throw new Error(`Failed to update order item status: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

  }
};
