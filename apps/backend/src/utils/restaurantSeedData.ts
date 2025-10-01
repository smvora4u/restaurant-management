import { MenuItem, Table } from '../models/index.js';
import mongoose from 'mongoose';

export const createSampleDataForRestaurant = async (restaurantId: mongoose.Types.ObjectId) => {
  try {
    // Check if data already exists for this restaurant
    const menuItemCount = await MenuItem.countDocuments({ restaurantId });
    const tableCount = await Table.countDocuments({ restaurantId });
    
    if (menuItemCount === 0) {
      console.log(`🌱 Creating sample menu items for restaurant ${restaurantId}...`);
      const sampleMenuItems = [
        {
          restaurantId: restaurantId,
          name: 'Margherita Pizza',
          description: 'Classic tomato sauce, mozzarella, and fresh basil',
          price: 12.99,
          category: 'Pizza',
          ingredients: ['tomato sauce', 'mozzarella', 'basil', 'olive oil'],
          allergens: ['dairy', 'gluten'],
          preparationTime: 15
        },
        {
          restaurantId: restaurantId,
          name: 'Caesar Salad',
          description: 'Crisp romaine lettuce with caesar dressing and croutons',
          price: 8.99,
          category: 'Salad',
          ingredients: ['romaine lettuce', 'caesar dressing', 'croutons', 'parmesan'],
          allergens: ['dairy', 'gluten', 'eggs'],
          preparationTime: 10
        },
        {
          restaurantId: restaurantId,
          name: 'Grilled Salmon',
          description: 'Fresh Atlantic salmon with lemon herb butter',
          price: 18.99,
          category: 'Main Course',
          ingredients: ['salmon', 'lemon', 'herbs', 'butter'],
          allergens: ['fish', 'dairy'],
          preparationTime: 20
        },
        {
          restaurantId: restaurantId,
          name: 'Chocolate Lava Cake',
          description: 'Warm chocolate cake with molten center and vanilla ice cream',
          price: 6.99,
          category: 'Dessert',
          ingredients: ['chocolate', 'flour', 'eggs', 'sugar', 'vanilla ice cream'],
          allergens: ['dairy', 'eggs', 'gluten'],
          preparationTime: 12
        },
        {
          restaurantId: restaurantId,
          name: 'Chicken Burger',
          description: 'Grilled chicken breast with lettuce, tomato, and mayo',
          price: 11.99,
          category: 'Burger',
          ingredients: ['chicken breast', 'lettuce', 'tomato', 'mayo', 'bun'],
          allergens: ['gluten', 'eggs'],
          preparationTime: 15
        },
        {
          restaurantId: restaurantId,
          name: 'Vegetable Pasta',
          description: 'Penne pasta with seasonal vegetables in marinara sauce',
          price: 9.99,
          category: 'Pasta',
          ingredients: ['penne pasta', 'tomatoes', 'bell peppers', 'zucchini', 'onions'],
          allergens: ['gluten'],
          preparationTime: 12
        }
      ];
      
      await MenuItem.insertMany(sampleMenuItems);
      console.log(`✅ Sample menu items created for restaurant ${restaurantId}`);
    }
    
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
