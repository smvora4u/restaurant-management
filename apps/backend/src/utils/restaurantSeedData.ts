import { Table } from '../models/index.js';
import mongoose from 'mongoose';

export const createSampleDataForRestaurant = async (restaurantId: mongoose.Types.ObjectId) => {
  try {
    // Check if data already exists for this restaurant
    const tableCount = await Table.countDocuments({ restaurantId });
    
    if (tableCount === 0) {
      console.log(`🌱 Creating sample tables for restaurant ${restaurantId}...`);
      const sampleTables = [
        { restaurantId: restaurantId, number: 1, capacity: 4, status: 'available' },
        { restaurantId: restaurantId, number: 2, capacity: 2, status: 'available' },
        { restaurantId: restaurantId, number: 3, capacity: 6, status: 'available' },
        { restaurantId: restaurantId, number: 4, capacity: 4, status: 'available' },
        { restaurantId: restaurantId, number: 5, capacity: 8, status: 'available' },
        { restaurantId: restaurantId, number: 6, capacity: 2, status: 'available' }
      ];
      
      await Table.insertMany(sampleTables);
      console.log(`✅ Sample tables created for restaurant ${restaurantId}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to create sample data for restaurant ${restaurantId}:`, error);
    throw error;
  }
};
