import bcrypt from 'bcryptjs';
import { Admin, Restaurant, Order, AuditLog } from '../models/index.js';
import { publishAuditLogCreated, publishRestaurantUpdated, publishPlatformAnalyticsUpdated } from './subscriptions.js';
import { GraphQLContext } from '../types/index.js';
import { createSampleDataForRestaurant } from '../utils/restaurantSeedData.js';
import { generateUniqueSlug } from '../utils/slugGenerator.js';
import { hashPassword } from '../utils/passwordReset.js';

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
      
      // Hash password with new method (SHA256 + bcrypt)
      const hashedPassword = await hashPassword(input.password);
      
      const restaurant = new Restaurant({
        ...input,
        password: hashedPassword,
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
      
      // Hash password if provided with new method (SHA256 + bcrypt)
      const updateData = { ...input };
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }
      
      // Merge settings to preserve itemInstructions, kitchenBoardClickIncrement, billSize, networkPrinter when admin updates
      if (updateData.settings) {
        const existing = await Restaurant.findById(id).select('settings').lean();
        const existingSettings = (existing?.settings as any) || {};
        updateData.settings = {
          currency: updateData.settings.currency ?? existingSettings.currency ?? 'USD',
          timezone: updateData.settings.timezone ?? existingSettings.timezone ?? 'UTC',
          theme: updateData.settings.theme !== undefined ? updateData.settings.theme : existingSettings.theme,
          itemInstructions: updateData.settings.itemInstructions !== undefined ? updateData.settings.itemInstructions : (existingSettings.itemInstructions ?? []),
          kitchenBoardClickIncrement: updateData.settings.kitchenBoardClickIncrement ?? existingSettings.kitchenBoardClickIncrement ?? 1,
          billSize: updateData.settings.billSize ?? existingSettings.billSize,
          networkPrinter: updateData.settings.networkPrinter ?? existingSettings.networkPrinter
        };
      }
      
      const updated = await Restaurant.findByIdAndUpdate(id, updateData, { new: true });
      if (updated) {
        // publish events
        await publishRestaurantUpdated(updated);
        await publishPlatformAnalyticsUpdated({});
        try {
          const log = await AuditLog.create({
            actorRole: 'ADMIN',
            actorId: context.admin.id,
            action: 'RESTAURANT_UPDATED',
            entityType: 'RESTAURANT',
            entityId: String(updated._id),
            details: { fields: Object.keys(updateData) }
          });
          publishAuditLogCreated({
            id: log._id,
            actorRole: log.actorRole,
            actorId: log.actorId,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            reason: log.reason,
            details: log.details,
            restaurantId: log.restaurantId,
            createdAt: log.createdAt
          });
        } catch {}
      }
      return updated;
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