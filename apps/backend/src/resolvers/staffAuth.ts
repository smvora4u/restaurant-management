import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Staff } from '../models/index.js';
import { StaffInput } from '../types/index.js';

export const staffAuthResolvers = {
  Mutation: {
    loginStaff: async (_: any, { email, password }: { email: string; password: string }) => {
      try {
        const staff = await Staff.findOne({ email, isActive: true });
        
        if (!staff) {
          throw new Error('Staff not found or inactive');
        }

        const isValidPassword = await bcrypt.compare(password, staff.password);
        
        if (!isValidPassword) {
          throw new Error('Invalid password');
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
          }
        };
      } catch (error) {
        throw new Error(`Failed to login staff: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    createStaff: async (_: any, { input }: { input: StaffInput }) => {
      try {
        // Check if staff with email already exists for this restaurant
        const existingStaff = await Staff.findOne({ 
          email: input.email, 
          restaurantId: input.restaurantId 
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
