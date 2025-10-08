import { MenuItem, Table, Order, Reservation, User, FeeLedger, RestaurantFeeConfig, Settlement, Restaurant } from '../models/index.js';
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
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await MenuItem.find({ restaurantId }).sort({ createdAt: -1 });
  },
  menuItem: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await MenuItem.findOne({ _id: id, restaurantId });
  },
  
  // Tables
  tables: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await Table.find({ restaurantId }).sort({ number: 1 });
  },
  table: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await Table.findOne({ _id: id, restaurantId });
  },
  availableTables: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    
    // Get all tables
    const allTables = await Table.find({ restaurantId }).sort({ number: 1 });
    
    // Get tables with active orders
    const activeOrders = await Order.find({
      restaurantId,
      orderType: 'dine-in',
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
    });
    
    const occupiedTableNumbers = new Set(activeOrders.map(order => order.tableNumber));
    
    // Filter out occupied tables
    const availableTables = allTables.filter(table => !occupiedTableNumbers.has(table.number));
    
    return availableTables;
  },
  
  // Orders
  orders: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await Order.find({ restaurantId }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  feeLedgers: async (_: any, { restaurantId, limit = 50, offset = 0 }: any, context: GraphQLContext) => {
    if (!context.admin && (!context.restaurant || context.restaurant.id !== restaurantId)) {
      throw new Error('Unauthorized');
    }
    const [data, totalCount] = await Promise.all([
      FeeLedger.find({ restaurantId }).sort({ createdAt: -1 }).skip(offset).limit(limit),
      FeeLedger.countDocuments({ restaurantId })
    ]);
    return {
      data,
      totalCount
    };
  },
  restaurantFeeConfig: async (_: any, { restaurantId }: any, context: GraphQLContext) => {
    if (!context.admin && (!context.restaurant || context.restaurant.id !== restaurantId)) {
      throw new Error('Unauthorized');
    }
    return await RestaurantFeeConfig.findOne({ restaurantId });
  },
  settlements: async (_: any, { restaurantId, limit = 50, offset = 0 }: any, context: GraphQLContext) => {
    if (!context.admin && (!context.restaurant || context.restaurant.id !== restaurantId)) {
      throw new Error('Unauthorized');
    }
    return await Settlement.find({ restaurantId }).sort({ periodStart: -1 }).skip(offset).limit(limit);
  },
  dueFeesSummary: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.admin) {
      throw new Error('Admin authentication required');
    }
    
    // Get all restaurants
    const restaurants = await Restaurant.find({ isActive: true });
    
    // Calculate due fees for each restaurant
    const dueFeesSummary = await Promise.all(
      restaurants.map(async (restaurant) => {
        // Get pending fees for this restaurant
        const pendingFees = await FeeLedger.find({ 
          restaurantId: restaurant.id, 
          paymentStatus: 'pending' 
        }).sort({ createdAt: 1 });
        
        // Get last payment date
        const lastPaidFee = await FeeLedger.findOne({ 
          restaurantId: restaurant.id, 
          paymentStatus: 'paid' 
        }).sort({ paidAt: -1 });
        
        const totalDueFees = pendingFees.reduce((sum, fee) => sum + fee.feeAmount, 0);
        
        return {
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          totalDueFees,
          pendingCount: pendingFees.length,
          currency: 'USD', // Default currency
          lastPaymentDate: lastPaidFee?.paidAt?.toISOString() || null,
          oldestDueDate: pendingFees.length > 0 ? pendingFees[0]?.createdAt.toISOString() : null
        };
      })
    );
    
    // Filter out restaurants with no due fees
    return dueFeesSummary.filter(summary => summary.totalDueFees > 0);
  },
  order: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await Order.findOne({ _id: id, restaurantId }).populate('items.menuItemId');
  },
  orderByTable: async (_: any, { tableNumber }: { tableNumber: number }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await Order.findOne({ 
      tableNumber, 
      orderType: 'dine-in', 
      restaurantId 
    }).populate('items.menuItemId');
  },
  orderById: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await Order.findOne({ _id: id, restaurantId }).populate('items.menuItemId');
  },
  ordersBySession: async (_: any, { sessionId, orderType }: { sessionId: string; orderType: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await Order.find({ 
      sessionId, 
      orderType, 
      restaurantId 
    }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  ordersByUser: async (_: any, { userId, orderType }: { userId: string; orderType: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await Order.find({ 
      userId, 
      orderType, 
      restaurantId 
    }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  ordersByMobile: async (_: any, { mobileNumber, orderType }: { mobileNumber: string; orderType: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await Order.find({ 
      customerPhone: mobileNumber, 
      orderType,
      restaurantId,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } // Only incomplete orders
    }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  
  // Staff-specific queries
  ordersForStaff: async (_: any, { restaurantId }: { restaurantId: string }, context: GraphQLContext) => {
    if (!context.staff) {
      throw new Error('Staff authentication required');
    }
    if (context.staff.restaurantId !== restaurantId) {
      throw new Error('Access denied: Cannot access orders from different restaurant');
    }
    return await Order.find({ restaurantId }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  orderByIdForStaff: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.staff) {
      throw new Error('Staff authentication required');
    }
    return await Order.findOne({ _id: id, restaurantId: context.staff.restaurantId }).populate('items.menuItemId');
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
