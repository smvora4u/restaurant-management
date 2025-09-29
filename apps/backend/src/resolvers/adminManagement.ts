import { Admin, Restaurant, Order } from '../models/index.js';
import { AdminInput } from '../types/index.js';

export const adminQueries = {
  // Get all restaurants (admin only)
  allRestaurants: async (_: any, __: any, context: any) => {
    if (!context.admin || !context.admin.permissions.includes('manage_restaurants')) {
      throw new Error('Access denied');
    }
    
    return await Restaurant.find({}).sort({ createdAt: -1 });
  },
  
  // Get restaurant by ID (admin only)
  restaurantById: async (_: any, { id }: { id: string }, context: any) => {
    if (!context.admin || !context.admin.permissions.includes('manage_restaurants')) {
      throw new Error('Access denied');
    }
    
    return await Restaurant.findById(id);
  },
  
  // Get platform analytics
  platformAnalytics: async (_: any, __: any, context: any) => {
    if (!context.admin || !context.admin.permissions.includes('view_analytics')) {
      throw new Error('Access denied');
    }
    
    const totalRestaurants = await Restaurant.countDocuments();
    const activeRestaurants = await Restaurant.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    return {
      totalRestaurants,
      activeRestaurants,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    };
  },
  
  // Get all orders across all restaurants
  allOrders: async (_: any, { limit = 50, offset = 0 }: { limit?: number; offset?: number }, context: any) => {
    if (!context.admin || !context.admin.permissions.includes('manage_restaurants')) {
      throw new Error('Access denied');
    }
    
    return await Order.find({})
      .populate('restaurantId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
  }
};

export const adminMutations = {
  // Create new restaurant (admin only)
  createRestaurant: async (_: any, { input }: { input: any }, context: any) => {
    if (!context.admin || !context.admin.permissions.includes('manage_restaurants')) {
      throw new Error('Access denied');
    }
    
    const restaurant = new Restaurant(input);
    return await restaurant.save();
  },
  
  // Update restaurant (admin only)
  updateRestaurant: async (_: any, { id, input }: { id: string; input: any }, context: any) => {
    if (!context.admin || !context.admin.permissions.includes('manage_restaurants')) {
      throw new Error('Access denied');
    }
    
    return await Restaurant.findByIdAndUpdate(id, input, { new: true });
  },
  
  // Deactivate restaurant (admin only)
  deactivateRestaurant: async (_: any, { id }: { id: string }, context: any) => {
    if (!context.admin || !context.admin.permissions.includes('manage_restaurants')) {
      throw new Error('Access denied');
    }
    
    return await Restaurant.findByIdAndUpdate(id, { isActive: false }, { new: true });
  },
  
  // Create admin user (super admin only)
  createAdmin: async (_: any, { input }: { input: AdminInput }, context: any) => {
    if (!context.admin || context.admin.role !== 'super_admin') {
      throw new Error('Access denied');
    }
    
    const newAdmin = new Admin(input);
    return await newAdmin.save();
  }
};
