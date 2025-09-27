import { MenuItem, Table, Order, Reservation, User } from '../models/index.js';
import { GraphQLContext } from '../types/index.js';
import mongoose from 'mongoose';

export const queryResolvers = {
  health: async () => {
    const mongoOk = mongoose.connection.readyState === 1;
    return { ok: true, mongo: mongoOk };
  },
  
  // Menu Items
  menuItems: async () => {
    return await MenuItem.find().sort({ createdAt: -1 });
  },
  menuItem: async (_: any, { id }: { id: string }) => {
    return await MenuItem.findById(id);
  },
  
  // Tables
  tables: async () => {
    return await Table.find().sort({ number: 1 });
  },
  table: async (_: any, { id }: { id: string }) => {
    return await Table.findById(id);
  },
  
  // Orders
  orders: async () => {
    return await Order.find().populate('items.menuItemId').sort({ createdAt: -1 });
  },
  order: async (_: any, { id }: { id: string }) => {
    return await Order.findById(id).populate('items.menuItemId');
  },
  orderByTable: async (_: any, { tableNumber }: { tableNumber: number }) => {
    return await Order.findOne({ tableNumber, orderType: 'dine-in' }).populate('items.menuItemId');
  },
  orderById: async (_: any, { id }: { id: string }) => {
    return await Order.findById(id).populate('items.menuItemId');
  },
  ordersBySession: async (_: any, { sessionId, orderType }: { sessionId: string; orderType: string }) => {
    return await Order.find({ sessionId, orderType }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  ordersByUser: async (_: any, { userId, orderType }: { userId: string; orderType: string }) => {
    return await Order.find({ userId, orderType }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  ordersByMobile: async (_: any, { mobileNumber, orderType }: { mobileNumber: string; orderType: string }) => {
    return await Order.find({ 
      customerPhone: mobileNumber, 
      orderType,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } // Only incomplete orders
    }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  userByMobile: async (_: any, { mobileNumber }: { mobileNumber: string }) => {
    return await User.findOne({ mobileNumber });
  },
  
  // Reservations
  reservations: async () => {
    return await Reservation.find().sort({ date: 1, time: 1 });
  },
  reservation: async (_: any, { id }: { id: string }) => {
    return await Reservation.findById(id);
  },
};
