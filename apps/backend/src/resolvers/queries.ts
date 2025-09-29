import { MenuItem, Table, Order, Reservation, User } from '../models/index.js';
import { GraphQLContext } from '../types/index.js';
import mongoose from 'mongoose';

export const queryResolvers = {
  health: async () => {
    const mongoOk = mongoose.connection.readyState === 1;
    return { ok: true, mongo: mongoOk };
  },
  
  // Public restaurant query (no authentication required)
  restaurantBySlug: async (_: any, { slug }: { slug: string }) => {
    const Restaurant = (await import('../models/Restaurant.js')).default;
    return await Restaurant.findOne({ slug, isActive: true });
  },
  
  // Menu Items
  menuItems: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await MenuItem.find({ restaurantId: context.restaurant.id }).sort({ createdAt: -1 });
  },
  menuItem: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await MenuItem.findOne({ _id: id, restaurantId: context.restaurant.id });
  },
  
  // Tables
  tables: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Table.find({ restaurantId: context.restaurant.id }).sort({ number: 1 });
  },
  table: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Table.findOne({ _id: id, restaurantId: context.restaurant.id });
  },
  
  // Orders
  orders: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Order.find({ restaurantId: context.restaurant.id }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  order: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Order.findOne({ _id: id, restaurantId: context.restaurant.id }).populate('items.menuItemId');
  },
  orderByTable: async (_: any, { tableNumber }: { tableNumber: number }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Order.findOne({ 
      tableNumber, 
      orderType: 'dine-in', 
      restaurantId: context.restaurant.id 
    }).populate('items.menuItemId');
  },
  orderById: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Order.findOne({ _id: id, restaurantId: context.restaurant.id }).populate('items.menuItemId');
  },
  ordersBySession: async (_: any, { sessionId, orderType }: { sessionId: string; orderType: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Order.find({ 
      sessionId, 
      orderType, 
      restaurantId: context.restaurant.id 
    }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  ordersByUser: async (_: any, { userId, orderType }: { userId: string; orderType: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Order.find({ 
      userId, 
      orderType, 
      restaurantId: context.restaurant.id 
    }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  ordersByMobile: async (_: any, { mobileNumber, orderType }: { mobileNumber: string; orderType: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Order.find({ 
      customerPhone: mobileNumber, 
      orderType,
      restaurantId: context.restaurant.id,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } // Only incomplete orders
    }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  userByMobile: async (_: any, { mobileNumber }: { mobileNumber: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await User.findOne({ mobileNumber, restaurantId: context.restaurant.id });
  },
  
  // Reservations
  reservations: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Reservation.find({ restaurantId: context.restaurant.id }).sort({ date: 1, time: 1 });
  },
  reservation: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Reservation.findOne({ _id: id, restaurantId: context.restaurant.id });
  },
};
