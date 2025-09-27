import { MenuItem, Table } from '../models/index.js';

export const seedInitialData = async () => {
  try {
    // Check if data already exists
    const menuItemCount = await MenuItem.countDocuments();
    const tableCount = await Table.countDocuments();
    
    if (menuItemCount === 0) {
      console.log('🌱 Seeding menu items...');
      const sampleMenuItems = [
        {
          name: 'Margherita Pizza',
          description: 'Classic tomato sauce, mozzarella, and fresh basil',
          price: 12.99,
          category: 'Pizza',
          ingredients: ['tomato sauce', 'mozzarella', 'basil', 'olive oil'],
          allergens: ['dairy', 'gluten'],
          preparationTime: 15
        },
        {
          name: 'Caesar Salad',
          description: 'Crisp romaine lettuce with caesar dressing and croutons',
          price: 8.99,
          category: 'Salad',
          ingredients: ['romaine lettuce', 'caesar dressing', 'croutons', 'parmesan'],
          allergens: ['dairy', 'gluten', 'eggs'],
          preparationTime: 10
        },
        {
          name: 'Grilled Salmon',
          description: 'Fresh Atlantic salmon with lemon herb butter',
          price: 18.99,
          category: 'Main Course',
          ingredients: ['salmon', 'lemon', 'herbs', 'butter'],
          allergens: ['fish', 'dairy'],
          preparationTime: 20
        },
        {
          name: 'Chocolate Lava Cake',
          description: 'Warm chocolate cake with molten center and vanilla ice cream',
          price: 6.99,
          category: 'Dessert',
          ingredients: ['chocolate', 'flour', 'eggs', 'sugar', 'vanilla ice cream'],
          allergens: ['dairy', 'eggs', 'gluten'],
          preparationTime: 12
        }
      ];
      
      await MenuItem.insertMany(sampleMenuItems);
      console.log('✅ Menu items seeded');
    }
    
    if (tableCount === 0) {
      console.log('🌱 Seeding tables...');
      const sampleTables = [
        { number: 1, capacity: 2, location: 'Window side' },
        { number: 2, capacity: 4, location: 'Center' },
        { number: 3, capacity: 6, location: 'Back corner' },
        { number: 4, capacity: 2, location: 'Window side' },
        { number: 5, capacity: 8, location: 'Private area' },
        { number: 6, capacity: 4, location: 'Center' }
      ];
      
      await Table.insertMany(sampleTables);
      console.log('✅ Tables seeded');
    }
    
    console.log('🎉 Database seeding completed!');
  } catch (error) {
    console.log('⚠️ Error seeding data:', error instanceof Error ? error.message : String(error));
  }
};
