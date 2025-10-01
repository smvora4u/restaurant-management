import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Restaurant } from '../models/index.js';
import { RestaurantInput } from '../types/index.js';
import { createSampleDataForRestaurant } from '../utils/restaurantSeedData.js';

export const restaurantAuthResolvers = {
  Mutation: {
    registerRestaurant: async (_: any, { input }: { input: RestaurantInput }) => {
      try {
        // Check if restaurant already exists
        const existingRestaurant = await Restaurant.findOne({
          $or: [
            { email: input.email },
            { slug: input.slug || input.name.toLowerCase().replace(/\s+/g, '-') }
          ]
        });

        if (existingRestaurant) {
          throw new Error('Restaurant with this email or slug already exists');
        }

        // Create slug if not provided
        const slug = input.slug || input.name.toLowerCase().replace(/\s+/g, '-');

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

        // Generate JWT token
        const token = jwt.sign(
          { 
            restaurantId: restaurant._id, 
            email: restaurant.email,
            slug: restaurant.slug
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

        return {
          token,
          restaurant: {
            id: restaurant._id,
            name: restaurant.name,
            slug: restaurant.slug,
            email: restaurant.email,
            address: restaurant.address,
            phone: restaurant.phone,
            settings: restaurant.settings,
            isActive: restaurant.isActive,
            createdAt: restaurant.createdAt,
            updatedAt: restaurant.updatedAt
          }
        };
      } catch (error) {
        throw new Error(`Failed to register restaurant: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    loginRestaurant: async (_: any, { email, password }: { email: string; password: string }) => {
      try {
        const restaurant = await Restaurant.findOne({ email, isActive: true });
        
        if (!restaurant) {
          throw new Error('Restaurant not found or inactive');
        }

        const isValidPassword = await bcrypt.compare(password, restaurant.password);
        
        if (!isValidPassword) {
          throw new Error('Invalid password');
        }

        // Generate JWT token
        const token = jwt.sign(
          { 
            restaurantId: restaurant._id, 
            email: restaurant.email,
            slug: restaurant.slug
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

        return {
          token,
          restaurant: {
            id: restaurant._id,
            name: restaurant.name,
            slug: restaurant.slug,
            email: restaurant.email,
            address: restaurant.address,
            phone: restaurant.phone,
            settings: restaurant.settings,
            isActive: restaurant.isActive,
            createdAt: restaurant.createdAt,
            updatedAt: restaurant.updatedAt
          }
        };
      } catch (error) {
        throw new Error(`Failed to login restaurant: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
};