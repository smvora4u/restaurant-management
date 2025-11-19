import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Staff, Restaurant, AuditLog } from '../models/index.js';
import { publishAuditLogCreated, publishStaffUpdated } from './subscriptions.js';
import { StaffInput } from '../types/index.js';
import { generatePasswordResetToken, consumePasswordResetToken, hashPassword } from '../utils/passwordReset.js';
import { sendPasswordResetEmail } from '../services/email.js';

export const staffAuthResolvers = {
  Mutation: {
    loginStaff: async (_: any, { email, password }: { email: string; password: string }) => {
      try {
        const staff = await Staff.findOne({ email, isActive: true });
        
        if (!staff) {
          // Check if staff exists but is inactive
          const inactiveStaff = await Staff.findOne({ email });
          if (inactiveStaff) {
            throw new Error('Staff account is inactive');
          }
          throw new Error('Staff not found');
        }

        // Frontend sends SHA256 hash, stored password is bcrypt(SHA256) for new format
        // OR just SHA256 hash for old plaintext passwords
        let isValidPassword = false;
        let needsMigration = false;
        
        // Try new format first (bcrypt comparison)
        // password is SHA256 from frontend, staff.password should be bcrypt(SHA256)
        isValidPassword = await bcrypt.compare(password, staff.password);
        
        // Fallback: Check if stored password is plaintext (old production data)
        if (!isValidPassword) {
          // Check if password in DB is the same SHA256 hash sent from frontend
          if (staff.password === password) {
            isValidPassword = true;
            needsMigration = true;
          } else {
            // Could also be plaintext in DB
            // We can't convert SHA256 back to plaintext, so we manually check known plaintext
            // This is a temporary migration path
            const crypto = await import('crypto');
            const commonPlaintextPasswords = ['staff123', 'password123', 'demo123', 'password', '123456'];
            for (const plainPass of commonPlaintextPasswords) {
              // Hash plaintext and see if it matches what frontend sent
              const hashOfPlaintext = crypto.createHash('sha256').update(plainPass).digest('hex');
              if (hashOfPlaintext === password && staff.password === plainPass) {
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
          await Staff.updateOne({ _id: staff._id }, { password: hashedPassword });
          console.log(`✅ Auto-migrated staff password for ${email}`);
        }

        // Fetch restaurant data
        const restaurant = await Restaurant.findById(staff.restaurantId);
        
        if (!restaurant) {
          throw new Error('Staff member is associated with a non-existent restaurant. Please contact administrator.');
        }
        
        if (!restaurant.isActive) {
          throw new Error('Restaurant is inactive. Staff cannot login.');
        }

        // Generate JWT token
        // Convert ObjectIds to strings to ensure consistent serialization
        const token = jwt.sign(
          { 
            staffId: staff._id.toString(), 
            email: staff.email,
            role: staff.role,
            permissions: staff.permissions,
            restaurantId: staff.restaurantId.toString()
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
          manager: ['manage_orders', 'view_orders', 'update_order_status', 'view_kitchen'],
          waiter: ['view_orders', 'update_order_status'],
          kitchen_staff: ['view_orders', 'update_order_status', 'view_kitchen'],
          cashier: ['view_orders', 'update_order_status']
        };

        const permissions = input.permissions || defaultPermissions[input.role || 'waiter'];

        // Hash password with new method (SHA256 + bcrypt)
        const hashedPassword = await hashPassword(input.password);

        const staff = new Staff({
          ...input,
          password: hashedPassword,
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

    updateStaff: async (_: any, { id, input }: { id: string; input: any }) => {
      try {
        // Find the staff member first
        const existingStaff = await Staff.findById(id);
        if (!existingStaff) {
          throw new Error('Staff not found');
        }

        // Prepare update data
        const updateData: any = {
          ...input,
          updatedAt: new Date()
        };

        // Handle password update - hash if provided
        if (input.password && input.password.trim() !== '') {
          // Hash the password with new method (SHA256 + bcrypt)
          updateData.password = await hashPassword(input.password);
        } else {
          // Don't update password if empty
          delete updateData.password;
        }

        // Update the staff member
        const staff = await Staff.findByIdAndUpdate(
          id,
          updateData,
          { new: true }
        );

        if (!staff) {
          throw new Error('Failed to update staff');
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

    deactivateStaff: async (_: any, { id }: { id: string }, __: any, info?: any) => {
      try {
        const staff = await Staff.findByIdAndUpdate(
          id,
          { isActive: false, updatedAt: new Date() },
          { new: true }
        );

        if (!staff) {
          throw new Error('Staff not found');
        }

        const result = {
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
        try {
          const log = await AuditLog.create({
            actorRole: 'ADMIN',
            action: 'STAFF_DEACTIVATED',
            entityType: 'STAFF',
            entityId: String(staff._id),
            restaurantId: String(staff.restaurantId)
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
          publishStaffUpdated(result);
        } catch {}
        return result;
      } catch (error) {
        throw new Error(`Failed to deactivate staff: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    ,
    activateStaff: async (_: any, { id }: { id: string }) => {
      try {
        const staff = await Staff.findByIdAndUpdate(
          id,
          { isActive: true, updatedAt: new Date() },
          { new: true }
        );

        if (!staff) {
          throw new Error('Staff not found');
        }

        const result = {
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
        try {
          const log = await AuditLog.create({
            actorRole: 'ADMIN',
            action: 'STAFF_ACTIVATED',
            entityType: 'STAFF',
            entityId: String(staff._id),
            restaurantId: String(staff.restaurantId)
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
          publishStaffUpdated(result);
        } catch {}
        return result;
      } catch (error) {
        throw new Error(`Failed to activate staff: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    resetStaffPassword: async (_: any, { email }: { email: string }) => {
      try {
        const staff = await Staff.findOne({ email, isActive: true });
        
        if (!staff) {
          // Don't reveal if email exists or not for security
          return {
            success: true,
            message: 'If the email exists, a password reset link has been sent.',
            token: null
          };
        }

        const resetToken = generatePasswordResetToken(email, 'staff');
        
        // Send password reset email
        const emailResult = await sendPasswordResetEmail(email, resetToken, 'staff');
        
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
        throw new Error(`Failed to reset staff password: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    updateStaffPassword: async (_: any, { token, newPassword }: { token: string; newPassword: string }) => {
      try {
        const resetData = consumePasswordResetToken(token);
        
        if (!resetData) {
          throw new Error('Invalid or expired reset token');
        }

        const staff = await Staff.findOne({ email: resetData.email, isActive: true });
        
        if (!staff) {
          throw new Error('Staff not found');
        }

        // Hash the new password using simple approach
        const hashedPassword = await hashPassword(newPassword);
        
        // Update password directly using updateOne (bypasses pre-save hooks)
        await Staff.updateOne(
          { email: resetData.email, isActive: true },
          { password: hashedPassword }
        );
        
        return {
          success: true,
          message: 'Password updated successfully',
          token: null
        };
      } catch (error) {
        throw new Error(`Failed to update staff password: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
};
