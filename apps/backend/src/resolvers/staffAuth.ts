import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Staff, Restaurant } from '../models/index.js';
import { StaffInput } from '../types/index.js';

export const staffAuthResolvers = {
  Mutation: {
    loginStaff: async (_: any, { email, password }: { email: string; password: string }) => {
      try {
        console.log('Attempting staff login for:', email);
        
        const staff = await Staff.findOne({ email, isActive: true });
        console.log('Found staff:', staff ? 'Yes' : 'No');
        
        if (!staff) {
          // Check if staff exists but is inactive
          const inactiveStaff = await Staff.findOne({ email });
          if (inactiveStaff) {
            throw new Error('Staff account is inactive');
          }
          throw new Error('Staff not found');
        }

        const isValidPassword = await bcrypt.compare(password, staff.password);
        console.log('Password valid:', isValidPassword);
        
        if (!isValidPassword) {
          throw new Error('Invalid password');
        }

        // Fetch restaurant data
        console.log('Looking for restaurant with ID:', staff.restaurantId);
        const restaurant = await Restaurant.findById(staff.restaurantId);
        console.log('Found restaurant:', restaurant ? 'Yes' : 'No');
        
        if (!restaurant) {
          console.log('ERROR: Staff member has invalid restaurantId:', staff.restaurantId);
          throw new Error('Staff member is associated with a non-existent restaurant. Please contact administrator.');
        }
        
        if (!restaurant.isActive) {
          throw new Error('Restaurant is inactive. Staff cannot login.');
        }

        // Generate JWT token
        const token = jwt.sign(
          { 
            staffId: staff._id, 
            email: staff.email,
            role: staff.role,
            permissions: staff.permissions,
            restaurantId: staff.restaurantId
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

        return {
          token,
          staff: {
            id: staff._id,
            name: staff.name,
            email: staff.email,
            role: staff.role,
            permissions: staff.permissions,
            restaurantId: staff.restaurantId,
            isActive: staff.isActive,
            createdAt: staff.createdAt,
            updatedAt: staff.updatedAt
          },
          restaurant: {
            id: restaurant._id,
            name: restaurant.name,
            email: restaurant.email,
            slug: restaurant.slug,
            address: restaurant.address,
            phone: restaurant.phone,
            isActive: restaurant.isActive
          }
        };
      } catch (error) {
        throw new Error(`Failed to login staff: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    createStaff: async (_: any, { input }: { input: StaffInput }) => {
      try {
        // Validate and convert restaurantId to ObjectId
        let restaurantId;
        try {
          restaurantId = new mongoose.Types.ObjectId(input.restaurantId);
        } catch (error) {
          throw new Error('Invalid restaurant ID format');
        }

        // Validate that the restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new Error('Restaurant not found');
        }
        
        if (!restaurant.isActive) {
          throw new Error('Cannot create staff for inactive restaurant');
        }

        // Check if staff with email already exists for this restaurant
        const existingStaff = await Staff.findOne({ 
          email: input.email, 
          restaurantId: restaurantId 
        });
        
        if (existingStaff) {
          throw new Error('Staff with this email already exists for this restaurant');
        }

        // Set default permissions based on role
        const defaultPermissions = {
          manager: ['manage_orders', 'view_orders', 'update_order_status', 'manage_menu', 'view_analytics'],
          waiter: ['view_orders', 'update_order_status'],
          kitchen_staff: ['view_orders', 'update_order_status'],
          cashier: ['view_orders', 'update_order_status']
        };

        const permissions = input.permissions || defaultPermissions[input.role || 'waiter'];

        const staff = new Staff({
          ...input,
          restaurantId: restaurantId, // Use the validated ObjectId
          permissions,
          role: input.role || 'waiter'
        });

        await staff.save();

        return {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          permissions: staff.permissions,
          restaurantId: staff.restaurantId,
          isActive: staff.isActive,
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt
        };
      } catch (error) {
        throw new Error(`Failed to create staff: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    updateStaff: async (_: any, { id, input }: { id: string; input: Partial<StaffInput> }) => {
      try {
        const staff = await Staff.findByIdAndUpdate(
          id,
          { ...input, updatedAt: new Date() },
          { new: true }
        );

        if (!staff) {
          throw new Error('Staff not found');
        }

        return {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          permissions: staff.permissions,
          restaurantId: staff.restaurantId,
          isActive: staff.isActive,
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt
        };
      } catch (error) {
        throw new Error(`Failed to update staff: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    deactivateStaff: async (_: any, { id }: { id: string }) => {
      try {
        const staff = await Staff.findByIdAndUpdate(
          id,
          { isActive: false, updatedAt: new Date() },
          { new: true }
        );

        if (!staff) {
          throw new Error('Staff not found');
        }

        return {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          permissions: staff.permissions,
          restaurantId: staff.restaurantId,
          isActive: staff.isActive,
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt
        };
      } catch (error) {
        throw new Error(`Failed to deactivate staff: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
};
