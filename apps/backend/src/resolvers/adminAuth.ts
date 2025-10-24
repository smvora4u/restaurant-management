import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/index.js';
import { AdminInput } from '../types/index.js';
import { generatePasswordResetToken, consumePasswordResetToken, hashPassword } from '../utils/passwordReset.js';

export const adminAuthResolvers = {
  Mutation: {
    loginAdmin: async (_: any, { email, password }: { email: string; password: string }) => {
      try {
        const admin = await Admin.findOne({ email, isActive: true });
        
        if (!admin) {
          throw new Error('Admin not found or inactive');
        }

        // Frontend sends SHA256-hashed password, so we use it directly
        const isValidPassword = await bcrypt.compare(password, admin.password);
        
        if (!isValidPassword) {
          throw new Error('Invalid password');
        }

        // Generate JWT token
        const token = jwt.sign(
          { 
            adminId: admin._id, 
            email: admin.email,
            role: admin.role,
            permissions: admin.permissions
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

        return {
          token,
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            permissions: admin.permissions,
            isActive: admin.isActive,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt
          }
        };
      } catch (error) {
        throw new Error(`Failed to login admin: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    resetAdminPassword: async (_: any, { email }: { email: string }) => {
      try {
        const admin = await Admin.findOne({ email, isActive: true });
        
        if (!admin) {
          // Don't reveal if email exists or not for security
          return {
            success: true,
            message: 'If the email exists, a password reset link has been sent.',
            token: null
          };
        }

        const resetToken = generatePasswordResetToken(email, 'admin');
        
        // In a real application, you would send an email here
        // For now, we'll just return the token (for development/testing)
        console.log(`Password reset token for ${email}: ${resetToken}`);
        
        return {
          success: true,
          message: 'Password reset token generated. Check console for token (development only).',
          token: resetToken
        };
      } catch (error) {
        throw new Error(`Failed to reset admin password: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    updateAdminPassword: async (_: any, { token, newPassword }: { token: string; newPassword: string }) => {
      try {
        const resetData = consumePasswordResetToken(token);
        
        if (!resetData) {
          throw new Error('Invalid or expired reset token');
        }

        const admin = await Admin.findOne({ email: resetData.email, isActive: true });
        
        if (!admin) {
          throw new Error('Admin not found');
        }

        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);
        
        // Update the password
        admin.password = hashedPassword;
        await admin.save();
        
        return {
          success: true,
          message: 'Password updated successfully',
          token: null
        };
      } catch (error) {
        throw new Error(`Failed to update admin password: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
};
