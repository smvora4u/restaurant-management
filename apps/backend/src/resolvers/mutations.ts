import { MenuItem, Table, Order, Reservation, User } from '../models/index.js';
import { GraphQLContext } from '../types/index.js';

export const mutationResolvers = {
  // Menu Item mutations
  createMenuItem: async (_: any, { input }: { input: any }) => {
    const menuItem = new MenuItem(input);
    return await menuItem.save();
  },
  updateMenuItem: async (_: any, { id, input }: { id: string; input: any }) => {
    return await MenuItem.findByIdAndUpdate(id, { ...input, updatedAt: new Date() }, { new: true });
  },
  deleteMenuItem: async (_: any, { id }: { id: string }) => {
    const result = await MenuItem.findByIdAndDelete(id);
    return !!result;
  },
  
  // Table mutations
  createTable: async (_: any, { input }: { input: any }) => {
    const table = new Table(input);
    return await table.save();
  },
  updateTable: async (_: any, { id, input }: { id: string; input: any }) => {
    return await Table.findByIdAndUpdate(id, input, { new: true });
  },
  deleteTable: async (_: any, { id }: { id: string }) => {
    const result = await Table.findByIdAndDelete(id);
    return !!result;
  },
  
  // User mutations
  createUser: async (_: any, { input }: { input: any }) => {
    const user = new User(input);
    return await user.save();
  },
  updateUser: async (_: any, { id, input }: { id: string; input: any }) => {
    return await User.findByIdAndUpdate(id, { ...input, updatedAt: new Date() }, { new: true });
  },
  deleteUser: async (_: any, { id }: { id: string }) => {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  },
  
  // Order mutations
  createOrder: async (_: any, { input }: { input: any }) => {
    const order = new Order(input);
    return await order.save();
  },
  updateOrder: async (_: any, { id, input }: { id: string; input: any }) => {
    return await Order.findByIdAndUpdate(id, { ...input, updatedAt: new Date() }, { new: true });
  },
  updateOrderItemStatus: async (_: any, { orderId, itemIndex, status }: { orderId: string; itemIndex: number; status: string }) => {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (!order.items || itemIndex < 0 || itemIndex >= order.items.length) {
      throw new Error('Invalid item index');
    }
    
    // Update the specific item status
    if (order.items[itemIndex]) {
      order.items[itemIndex].status = status as any;
    }
    
    // Calculate overall order status based on item statuses
    const itemStatuses = order.items.map(item => item.status);
    if (itemStatuses.every(status => status === 'cancelled')) {
      order.status = 'cancelled';
    } else if (itemStatuses.every(status => status === 'served')) {
      order.status = 'completed';
    } else if (itemStatuses.some(status => status === 'served')) {
      order.status = 'served';
    } else if (itemStatuses.some(status => status === 'ready')) {
      order.status = 'ready';
    } else if (itemStatuses.some(status => status === 'preparing')) {
      order.status = 'preparing';
    } else if (itemStatuses.some(status => status === 'confirmed')) {
      order.status = 'confirmed';
    } else {
      order.status = 'pending';
    }
    
    order.updatedAt = new Date();
    return await order.save();
  },
  deleteOrder: async (_: any, { id }: { id: string }) => {
    const result = await Order.findByIdAndDelete(id);
    return !!result;
  },
  
  // Reservation mutations
  createReservation: async (_: any, { input }: { input: any }) => {
    const reservation = new Reservation(input);
    return await reservation.save();
  },
  updateReservation: async (_: any, { id, input }: { id: string; input: any }) => {
    return await Reservation.findByIdAndUpdate(id, input, { new: true });
  },
  deleteReservation: async (_: any, { id }: { id: string }) => {
    const result = await Reservation.findByIdAndDelete(id);
    return !!result;
  },
};
