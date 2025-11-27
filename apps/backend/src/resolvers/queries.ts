import { MenuItem, Table, Order, Reservation, User, FeeLedger, RestaurantFeeConfig, Settlement, Restaurant, PurchaseCategory, Vendor, PurchaseItem, Purchase } from '../models/index.js';
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
    
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    
    // Get all tables
    const allTables = await Table.find({ restaurantId: restaurantObjectId }).sort({ number: 1 });
    
    // Get tables with active orders
    const activeOrders = await Order.find({
      restaurantId: restaurantObjectId,
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
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    return await Order.find({ restaurantId: restaurantObjectId }).populate('items.menuItemId').sort({ createdAt: -1 });
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
    
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }
    
    try {
      // Convert restaurantId string to ObjectId for proper MongoDB comparison
      const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
      const order = await Order.findOne({ _id: id, restaurantId: restaurantObjectId }).populate('items.menuItemId');
      
      if (!order) {
        console.error(`Order not found - ID: ${id}, RestaurantId: ${restaurantId} (ObjectId: ${restaurantObjectId})`);
        // Try to find the order without restaurantId filter to see if it exists
        const orderWithoutFilter = await Order.findById(id);
        if (orderWithoutFilter) {
          const orderRestaurantIdStr = orderWithoutFilter.restaurantId?.toString();
          const contextRestaurantIdStr = restaurantId;
          console.error(`Order exists but restaurantId mismatch - Order restaurantId: ${orderRestaurantIdStr}, Context restaurantId: ${contextRestaurantIdStr}`);
          console.error(`Order restaurantId type: ${typeof orderWithoutFilter.restaurantId}, Context restaurantId type: ${typeof restaurantId}`);
        } else {
          console.error(`Order with ID ${id} does not exist in database`);
        }
        // Don't return the order - it doesn't belong to this restaurant or doesn't exist
        return null;
      }
      
      return order;
    } catch (error: any) {
      console.error('Error querying order:', error);
      throw error;
    }
  },
  orderByTable: async (_: any, { tableNumber }: { tableNumber: number }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    return await Order.findOne({ 
      tableNumber, 
      orderType: 'dine-in', 
      restaurantId: restaurantObjectId 
    }).populate('items.menuItemId');
  },
  orderById: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    return await Order.findOne({ _id: id, restaurantId: restaurantObjectId }).populate('items.menuItemId');
  },
  ordersBySession: async (_: any, { sessionId, orderType }: { sessionId: string; orderType: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    return await Order.find({ 
      sessionId, 
      orderType, 
      restaurantId: restaurantObjectId 
    }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  ordersByUser: async (_: any, { userId, orderType }: { userId: string; orderType: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    return await Order.find({ 
      userId, 
      orderType, 
      restaurantId: restaurantObjectId 
    }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  ordersByMobile: async (_: any, { mobileNumber, orderType }: { mobileNumber: string; orderType: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    return await Order.find({ 
      customerPhone: mobileNumber, 
      orderType,
      restaurantId: restaurantObjectId,
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
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    return await Order.find({ restaurantId: restaurantObjectId }).populate('items.menuItemId').sort({ createdAt: -1 });
  },
  orderByIdForStaff: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.staff) {
      throw new Error('Staff authentication required');
    }
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(context.staff.restaurantId);
    return await Order.findOne({ _id: id, restaurantId: restaurantObjectId }).populate('items.menuItemId');
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
  
  // Purchase Management queries
  purchaseCategories: async (_: any, { restaurantId }: { restaurantId: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const authRestaurantId = context.restaurant?.id || context.staff?.restaurantId;
    if (authRestaurantId !== restaurantId) {
      throw new Error('Unauthorized');
    }
    return await PurchaseCategory.find({ restaurantId, isActive: true }).sort({ name: 1 });
  },
  purchaseCategory: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await PurchaseCategory.findOne({ _id: id, restaurantId });
  },
  vendors: async (_: any, { restaurantId }: { restaurantId: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const authRestaurantId = context.restaurant?.id || context.staff?.restaurantId;
    if (authRestaurantId !== restaurantId) {
      throw new Error('Unauthorized');
    }
    return await Vendor.find({ restaurantId, isActive: true }).sort({ name: 1 });
  },
  vendor: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    return await Vendor.findOne({ _id: id, restaurantId });
  },
  purchases: async (_: any, { restaurantId, limit = 50, offset = 0, vendorId, categoryId, paymentStatus, startDate, endDate }: any, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const authRestaurantId = context.restaurant?.id || context.staff?.restaurantId;
    if (authRestaurantId !== restaurantId) {
      throw new Error('Unauthorized');
    }
    
    const query: any = { restaurantId };
    if (vendorId) query.vendorId = vendorId;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) query.purchaseDate.$lte = new Date(endDate);
    }
    
    const [data, totalCount] = await Promise.all([
      Purchase.find(query)
        .populate('vendorId')
        .sort({ purchaseDate: -1 })
        .skip(offset)
        .limit(limit),
      Purchase.countDocuments(query)
    ]);
    
    // If categoryId filter is provided, filter by items
    let filteredData = data;
    if (categoryId) {
      const purchaseIds = await PurchaseItem.distinct('purchaseId', { categoryId });
      filteredData = data.filter((p: any) => purchaseIds.includes(p._id));
    }
    
    // Populate items for each purchase
    for (const purchase of filteredData) {
      const items = await PurchaseItem.find({ purchaseId: purchase._id }).populate('categoryId');
      (purchase as any).items = items;
    }
    
    return {
      data: filteredData,
      totalCount: categoryId ? filteredData.length : totalCount
    };
  },
  purchase: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    const purchase = await Purchase.findOne({ _id: id, restaurantId }).populate('vendorId');
    if (!purchase) return null;
    
    const items = await PurchaseItem.find({ purchaseId: purchase._id }).populate('categoryId');
    (purchase as any).items = items;
    
    return purchase;
  },
};
