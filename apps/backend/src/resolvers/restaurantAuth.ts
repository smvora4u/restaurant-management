import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Restaurant } from '../models/index.js';
import { RestaurantInput } from '../types/index.js';
import { generatePasswordResetToken, consumePasswordResetToken, hashPassword } from '../utils/passwordReset.js';
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

        // Frontend sends SHA256-hashed password, so we use it directly
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
    },

    resetRestaurantPassword: async (_: any, { email }: { email: string }) => {
      try {
        const restaurant = await Restaurant.findOne({ email, isActive: true });
        
        if (!restaurant) {
          // Don't reveal if email exists or not for security
          return {
            success: true,
            message: 'If the email exists, a password reset link has been sent.',
            token: null
          };
        }

        const resetToken = generatePasswordResetToken(email, 'restaurant');
        
        // In a real application, you would send an email here
        // For now, we'll just return the token (for development/testing)
        console.log(`Password reset token for ${email}: ${resetToken}`);
        
        return {
          success: true,
          message: 'Password reset token generated. Check console for token (development only).',
          token: resetToken
        };
      } catch (error) {
        throw new Error(`Failed to reset restaurant password: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    updateRestaurantPassword: async (_: any, { token, newPassword }: { token: string; newPassword: string }) => {
      try {
        const resetData = consumePasswordResetToken(token);
        
        if (!resetData) {
          throw new Error('Invalid or expired reset token');
        }

        const restaurant = await Restaurant.findOne({ email: resetData.email, isActive: true });
        
        if (!restaurant) {
          throw new Error('Restaurant not found');
        }

        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);
        
        // Update the password
        restaurant.password = hashedPassword;
        await restaurant.save();
        
        return {
          success: true,
          message: 'Password updated successfully',
          token: null
        };
      } catch (error) {
        throw new Error(`Failed to update restaurant password: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
};