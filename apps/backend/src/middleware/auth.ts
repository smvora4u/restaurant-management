import jwt from 'jsonwebtoken';
import { Restaurant, Admin, Staff } from '../models/index.js';

export interface AuthContext {
  restaurant?: {
    id: string;
    email: string;
    slug: string;
  };
  admin?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  staff?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    restaurantId: string;
  };
}

export const authenticateUser = async (req: any): Promise<AuthContext> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const restaurantId = req.headers['x-restaurant-id'];
    const restaurantSlug = req.headers['x-restaurant-slug'];
    
    // If we have restaurant context from headers (for consumer pages)
    if (restaurantId && restaurantSlug) {
      const Restaurant = (await import('../models/Restaurant.js')).default;
      const restaurant = await Restaurant.findById(restaurantId);
      if (restaurant && restaurant.slug === restaurantSlug && restaurant.isActive) {
        return {
          restaurant: {
            id: restaurant._id.toString(),
            email: restaurant.email,
            slug: restaurant.slug
          }
        };
      }
    }
    
    if (!token) {
      return {};
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    if (decoded.restaurantId) {
      // Restaurant authentication
      // Ensure restaurantId is converted to ObjectId for database lookup
      const mongoose = await import('mongoose');
      const restaurantObjectId = new mongoose.default.Types.ObjectId(decoded.restaurantId);
      const restaurant = await Restaurant.findById(restaurantObjectId);
      if (!restaurant || !restaurant.isActive) {
        throw new Error('Restaurant not found or inactive');
      }
      
      return {
        restaurant: {
          id: restaurant._id.toString(),
          email: restaurant.email,
          slug: restaurant.slug
        }
      };
    } else if (decoded.adminId) {
      // Admin authentication
      const admin = await Admin.findById(decoded.adminId);
      if (!admin || !admin.isActive) {
        throw new Error('Admin not found or inactive');
      }
      
      return {
        admin: {
          id: admin._id.toString(),
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions
        }
      };
    } else if (decoded.staffId) {
      // Staff authentication
      // Ensure IDs are converted to ObjectId for database lookup
      const mongoose = await import('mongoose');
      const staffObjectId = new mongoose.default.Types.ObjectId(decoded.staffId);
      const staff = await Staff.findById(staffObjectId);
      if (!staff || !staff.isActive) {
        throw new Error('Staff not found or inactive');
      }
      
      return {
        staff: {
          id: staff._id.toString(),
          email: staff.email,
          role: staff.role,
          permissions: staff.permissions,
          restaurantId: staff.restaurantId.toString()
        }
      };
    }
    
    return {};
  } catch (error) {
    console.error('Authentication error:', error);
    return {};
  }
};

// Keep the old function for backward compatibility
export const authenticateRestaurant = authenticateUser;
