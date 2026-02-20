import { Staff, Order, MenuItem, Restaurant } from '../models/index.js';
import { ORDER_STATUSES } from '../constants/orderStatuses.js';
import { publishOrderUpdated } from './subscriptions.js';
import { isProxyConnected, sendPrintJob } from '../services/printerProxy.js';
import { encodeReceiptToEscPos } from '../utils/encodeReceipt.js';
import { GraphQLContext } from '../types/index.js';

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
        
        return orders.map(order => {
          // Merge items with same menuItemId, status, and specialInstructions
          const mergedItemsMap = new Map<string, any>();
          
          order.items.forEach((item: any) => {
            // Normalize specialInstructions: undefined, null, or empty string all become empty string
            const normalizedInstructions = (item.specialInstructions && item.specialInstructions.trim()) || '';
            const key = `${item.menuItemId}-${item.status}-${normalizedInstructions}`;
            
            if (mergedItemsMap.has(key)) {
              // Merge with existing item
              const existing = mergedItemsMap.get(key);
              existing.quantity += item.quantity;
              // Ensure specialInstructions is normalized in the merged item
              existing.specialInstructions = normalizedInstructions || undefined;
            } else {
              // Add new item with normalized specialInstructions
              const itemObj = ('toObject' in item && typeof (item as any).toObject === 'function') 
                ? (item as any).toObject() 
                : { ...item };
              itemObj.specialInstructions = normalizedInstructions || undefined;
              mergedItemsMap.set(key, itemObj);
            }
          });
          
          const mergedItems = Array.from(mergedItemsMap.values());
          
          return {
            id: order._id,
            tableNumber: order.tableNumber,
            orderType: order.orderType,
            items: mergedItems,
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
        });
      } catch (error) {
        throw new Error(`Failed to fetch orders: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    printerProxyStatus: async (_: any, { restaurantId }: { restaurantId: string }, context: GraphQLContext) => {
      if (!context.staff && !context.restaurant) {
        throw new Error('Authentication required');
      }
      const allowedId = context.staff?.restaurantId || context.restaurant?.id;
      if (allowedId && String(allowedId) !== String(restaurantId)) {
        throw new Error('Unauthorized to check proxy status for this restaurant');
      }
      return { connected: isProxyConnected(restaurantId) };
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

        // Get the current order to check its status
        const currentOrder = await Order.findById(id);
        if (!currentOrder) {
          throw new Error('Order not found');
        }

        // Prevent updating cancelled or completed orders (terminal states)
        if (currentOrder.status === 'cancelled' || currentOrder.status === 'completed') {
          throw new Error(`Cannot update order that is ${currentOrder.status}. This is a terminal state.`);
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

    requestNetworkPrint: async (_: any, { orderId }: { orderId: string }, context: GraphQLContext) => {
      if (!context.staff && !context.restaurant) {
        throw new Error('Authentication required');
      }
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      const restaurantId = String(order.restaurantId);
      const allowedId = context.staff?.restaurantId || context.restaurant?.id;
      if (allowedId && String(allowedId) !== restaurantId) {
        throw new Error('Unauthorized to print for this order');
      }
      if (!isProxyConnected(restaurantId)) {
        throw new Error('Printer proxy not connected for this restaurant');
      }
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      const np = (restaurant.settings as any)?.networkPrinter;
      if (!np?.host || !np?.port) {
        throw new Error('Network printer not configured');
      }
      const menuItems = await MenuItem.find({ restaurantId });
      const receiptOrder = {
        id: String(order._id),
        ...(order.tableNumber != null && { tableNumber: order.tableNumber }),
        orderType: order.orderType,
        items: order.items.map((i: any) => ({
          menuItemId: String(i.menuItemId),
          quantity: i.quantity,
          price: i.price,
          specialInstructions: i.specialInstructions
        })),
        totalAmount: order.totalAmount,
        ...(order.customerName != null && { customerName: order.customerName }),
        ...(order.customerPhone != null && { customerPhone: order.customerPhone }),
        createdAt: order.createdAt
      };
      const receiptRestaurant = {
        name: restaurant.name,
        settings: restaurant.settings
      };
      const receiptMenuItems = menuItems.map((m: any) => ({ id: String(m._id), name: m.name }));
      const encoded = encodeReceiptToEscPos(receiptOrder, receiptRestaurant, receiptMenuItems);
      const sent = sendPrintJob(restaurantId, encoded);
      if (!sent) {
        throw new Error('Failed to send print job to proxy');
      }
      return true;
    }
  }
};
