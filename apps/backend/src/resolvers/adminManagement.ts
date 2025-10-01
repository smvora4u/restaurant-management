import { Admin, Restaurant, Order } from '../models/index.js';
import { GraphQLContext } from '../types/index.js';
import { createSampleDataForRestaurant } from '../utils/restaurantSeedData.js';
import { generateUniqueSlug } from '../utils/slugGenerator.js';

export const adminQueries = {
  allRestaurants: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.admin) {
      throw new Error('Authentication required');
    }
    return await Restaurant.find().sort({ createdAt: -1 });
  },
  restaurantById: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.admin) {
      throw new Error('Authentication required');
    }
    return await Restaurant.findById(id);
  },
  allOrders: async (_: any, { limit, offset }: { limit?: number; offset?: number }, context: GraphQLContext) => {
    if (!context.admin) {
      throw new Error('Authentication required');
    }
    
    const query = Order.find().sort({ createdAt: -1 });
    
    if (offset) {
      query.skip(offset);
    }
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  },
  platformAnalytics: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.admin) {
      throw new Error('Authentication required');
    }
    
    const totalRestaurants = await Restaurant.countDocuments();
    const activeRestaurants = await Restaurant.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    
    // Calculate total revenue
    const orders = await Order.find({}, 'totalAmount');
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    return {
      totalRestaurants,
      activeRestaurants,
      totalOrders,
      totalRevenue
    };
  }
};

export const adminMutations = {
    createRestaurant: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      if (!context.admin) {
        throw new Error('Authentication required');
      }
      
      // Check if restaurant already exists with this email
      const existingRestaurant = await Restaurant.findOne({ email: input.email });
      if (existingRestaurant) {
        throw new Error('Restaurant with this email already exists');
      }

      // Generate unique slug
      const baseSlug = input.slug || input.name.toLowerCase().replace(/\s+/g, '-');
      const slug = await generateUniqueSlug(baseSlug);
      
      const restaurant = new Restaurant({
        ...input,
        slug,
        settings: {
          currency: 'USD',
          timezone: 'UTC',
          ...input.settings
        }
      });
      
      await restaurant.save();
      
      // Create sample data for the new restaurant
      await createSampleDataForRestaurant(restaurant._id as any);
      
      return restaurant;
    },
    
    updateRestaurant: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
      if (!context.admin) {
        throw new Error('Authentication required');
      }
      
      return await Restaurant.findByIdAndUpdate(id, input, { new: true });
    },
    
    deleteRestaurant: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.admin) {
        throw new Error('Authentication required');
      }
      
      const result = await Restaurant.findByIdAndDelete(id);
      return !!result;
    },

    // New mutation to create sample data for existing restaurants
    createSampleDataForRestaurant: async (_: any, { restaurantId }: { restaurantId: string }, context: GraphQLContext) => {
      if (!context.admin) {
        throw new Error('Authentication required');
      }
      
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      
      await createSampleDataForRestaurant(restaurant._id as any);
      return { success: true, message: 'Sample data created successfully' };
    }
};