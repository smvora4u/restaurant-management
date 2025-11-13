import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Restaurant } from '../models/index.js';
import { RestaurantInput } from '../types/index.js';
import { generatePasswordResetToken, consumePasswordResetToken, hashPassword } from '../utils/passwordReset.js';
import { sendPasswordResetEmail } from '../services/email.js';
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

        // Frontend sends SHA256 hash, stored password is bcrypt(SHA256) for new format
        // OR just SHA256 hash for old plaintext passwords
        let isValidPassword = false;
        let needsMigration = false;
        
        // Try new format first (bcrypt comparison)
        // password is SHA256 from frontend, restaurant.password should be bcrypt(SHA256)
        isValidPassword = await bcrypt.compare(password, restaurant.password);
        
        // Fallback: Check if stored password is plaintext (old production data)
        if (!isValidPassword) {
          // Check if password in DB is the same SHA256 hash sent from frontend
          if (restaurant.password === password) {
            isValidPassword = true;
            needsMigration = true;
          } else {
            // Could also be plaintext in DB
            // We can't convert SHA256 back to plaintext, so we manually check known plaintext
            // This is a temporary migration path
            const crypto = await import('crypto');
            const commonPlaintextPasswords = ['demo123', 'restaurant123', 'password123', 'password', '123456'];
            for (const plainPass of commonPlaintextPasswords) {
              // Hash plaintext and see if it matches what frontend sent
              const hashOfPlaintext = crypto.createHash('sha256').update(plainPass).digest('hex');
              if (hashOfPlaintext === password && restaurant.password === plainPass) {
                isValidPassword = true;
                needsMigration = true;
                break;
              }
            }
          }
        }
        
        if (!isValidPassword) {
          throw new Error('Invalid password');
        }
        
        // Auto-migrate old password to new format (bcrypt(SHA256))
        if (needsMigration) {
          // Hash the incoming SHA256 with bcrypt (new format)
          const hashedPassword = await bcrypt.hash(password, 10);
          await Restaurant.updateOne({ _id: restaurant._id }, { password: hashedPassword });
          console.log(`✅ Auto-migrated restaurant password for ${email}`);
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
        
        // Send password reset email
        const emailResult = await sendPasswordResetEmail(email, resetToken, 'restaurant');
        
        if (!emailResult.success) {
          console.error('Failed to send password reset email:', emailResult.error);
          // Still return success to not reveal if email exists
        }
        
        // In development, also log the token for testing
        if (process.env.NODE_ENV === 'development') {
          console.log(`Password reset token for ${email}: ${resetToken}`);
        }
        
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent.',
          token: process.env.NODE_ENV === 'development' ? resetToken : null
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

        // Hash the new password using simple approach
        const hashedPassword = await hashPassword(newPassword);
        
        // Update password directly using updateOne (bypasses pre-save hooks)
        await Restaurant.updateOne(
          { email: resetData.email, isActive: true },
          { password: hashedPassword }
        );
        
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