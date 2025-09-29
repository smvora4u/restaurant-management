import { MenuItem, Table, Order, Reservation, User } from '../models/index.js';
import { GraphQLContext } from '../types/index.js';

export const mutationResolvers = {
  // Menu Item mutations
  createMenuItem: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const menuItem = new MenuItem({ ...input, restaurantId: context.restaurant.id });
    return await menuItem.save();
  },
  updateMenuItem: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await MenuItem.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id }, 
      { ...input, updatedAt: new Date() }, 
      { new: true }
    );
  },
  deleteMenuItem: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const result = await MenuItem.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
  
  // Table mutations
  createTable: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const table = new Table({ ...input, restaurantId: context.restaurant.id });
    return await table.save();
  },
  updateTable: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Table.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id }, 
      input, 
      { new: true }
    );
  },
  deleteTable: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const result = await Table.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
  
  // User mutations
  createUser: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const user = new User({ ...input, restaurantId: context.restaurant.id });
    return await user.save();
  },
  updateUser: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await User.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id }, 
      { ...input, updatedAt: new Date() }, 
      { new: true }
    );
  },
  deleteUser: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const result = await User.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
  
  // Order mutations
  createOrder: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const order = new Order({ ...input, restaurantId: context.restaurant.id });
    return await order.save();
  },
  updateOrder: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Order.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id }, 
      { ...input, updatedAt: new Date() }, 
      { new: true }
    );
  },
  updateOrderItemStatus: async (_: any, { orderId, itemIndex, status }: { orderId: string; itemIndex: number; status: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const order = await Order.findOne({ _id: orderId, restaurantId: context.restaurant.id });
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
  deleteOrder: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const result = await Order.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
  
  // Reservation mutations
  createReservation: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const reservation = new Reservation({ ...input, restaurantId: context.restaurant.id });
    return await reservation.save();
  },
  updateReservation: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Reservation.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id }, 
      input, 
      { new: true }
    );
  },
  deleteReservation: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const result = await Reservation.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
};
