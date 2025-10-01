import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/index.js';
import { AdminInput } from '../types/index.js';

export const adminAuthResolvers = {
  Mutation: {
    loginAdmin: async (_: any, { email, password }: { email: string; password: string }) => {
      try {
        const admin = await Admin.findOne({ email, isActive: true });
        
        if (!admin) {
          throw new Error('Admin not found or inactive');
        }

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
    }
  }
};
