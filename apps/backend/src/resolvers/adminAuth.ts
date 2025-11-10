import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/index.js';
import { AdminInput } from '../types/index.js';
import { generatePasswordResetToken, consumePasswordResetToken, hashPassword } from '../utils/passwordReset.js';
import { sendPasswordResetEmail } from '../services/email.js';

export const adminAuthResolvers = {
  Mutation: {
    loginAdmin: async (_: any, { email, password }: { email: string; password: string }) => {
      try {
        const admin = await Admin.findOne({ email, isActive: true });
        
        if (!admin) {
          throw new Error('Admin not found or inactive');
        }

        // Frontend sends SHA256 hash, stored password is bcrypt(SHA256) for new format
        // OR just SHA256 hash for old plaintext passwords
        let isValidPassword = false;
        let needsMigration = false;
        
        // Try new format first (bcrypt comparison)
        isValidPassword = await bcrypt.compare(password, admin.password);
        
        // Fallback: Check if stored password is plaintext (old production data)
        if (!isValidPassword) {
          // Check if password in DB is the same SHA256 hash sent from frontend
          if (admin.password === password) {
            isValidPassword = true;
            needsMigration = true;
          } else {
            // Could also be plaintext "admin123" in DB
            // We can't convert SHA256 back to plaintext, so we manually check known plaintext
            // This is a temporary migration path
            const commonPlaintextPasswords = ['admin123'];
            for (const plainPass of commonPlaintextPasswords) {
              // Hash plaintext and see if it matches what frontend sent
              const crypto = await import('crypto');
              const hashOfPlaintext = crypto.createHash('sha256').update(plainPass).digest('hex');
              if (hashOfPlaintext === password && admin.password === plainPass) {
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
        
        // Auto-migrate old password to new format
        if (needsMigration) {
          // Hash the incoming SHA256 with bcrypt (new format)
          const hashedPassword = await bcrypt.hash(password, 10);
          await Admin.updateOne({ _id: admin._id }, { password: hashedPassword });
          console.log(`✅ Auto-migrated admin password for ${email}`);
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
        
        // Send password reset email
        const emailResult = await sendPasswordResetEmail(email, resetToken, 'admin');
        
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

        // Hash the new password using simple approach
        const hashedPassword = await hashPassword(newPassword);
        
        // Update password directly using updateOne (bypasses pre-save hooks)
        await Admin.updateOne(
          { email: resetData.email, isActive: true },
          { password: hashedPassword }
        );
        
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
