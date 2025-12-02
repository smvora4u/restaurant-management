import { Admin, Restaurant, MenuItem, Table } from '../models/index.js';
import { hashPassword } from './passwordReset.js';
import crypto from 'crypto';

export const seedInitialData = async () => {
  try {
    // Get super admin credentials from environment variables or use defaults
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@platform.com';
    let superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    let passwordWasGenerated = false;
    
    // Generate secure random password if not provided
    if (!superAdminPassword) {
      superAdminPassword = crypto.randomBytes(16).toString('hex');
      passwordWasGenerated = true;
    }
    
    // Check if super admin already exists
    let superAdmin = await Admin.findOne({ email: superAdminEmail });
    
    if (!superAdmin) {
      console.log('🌱 Creating super admin...');
      
      // Hash plaintext password: SHA256 first (as frontend does), then bcrypt
      const sha256Hash = crypto.createHash('sha256').update(superAdminPassword).digest('hex');
      const hashedPassword = await hashPassword(sha256Hash);
      
      superAdmin = new Admin({
        name: 'Super Admin',
        email: superAdminEmail,
        password: hashedPassword,
        role: 'super_admin',
        permissions: ['manage_restaurants', 'view_analytics', 'manage_users', 'system_settings', 'view_all_data'],
        isActive: true
      });
      
      await superAdmin.save();
      console.log('✅ Super admin created');
      
      // Log password only if it was auto-generated
      if (passwordWasGenerated) {
        console.log('⚠️  No SUPER_ADMIN_PASSWORD set. Generated secure password:', superAdminPassword);
        console.log('⚠️  IMPORTANT: Save this password securely!');
        console.log('⚠️  Set SUPER_ADMIN_PASSWORD in .env to use a custom password.');
      } else {
        console.log('✅ Super admin password set from SUPER_ADMIN_PASSWORD environment variable');
      }
    }

    // Check if restaurant already exists
    let restaurant = await Restaurant.findOne({ slug: 'demo-restaurant' });
    
    if (!restaurant) {
      console.log('🌱 Creating demo restaurant...');
      // Hash plaintext password: SHA256 first (as frontend does), then bcrypt
      const sha256Hash = crypto.createHash('sha256').update('demo123').digest('hex');
      const hashedPassword = await hashPassword(sha256Hash);
      
      restaurant = new Restaurant({
        name: 'Demo Restaurant',
        slug: 'demo-restaurant',
        email: 'demo@restaurant.com',
        password: hashedPassword,
        address: '123 Main Street, City, State 12345',
        phone: '+1-555-0123',
        settings: {
          currency: 'USD',
          timezone: 'America/New_York'
        },
        isActive: true
      });
      
      await restaurant.save();
      console.log('✅ Demo restaurant created');
    }
    
    // Check if data already exists for this restaurant
    const menuItemCount = await MenuItem.countDocuments({ restaurantId: restaurant._id });
    const tableCount = await Table.countDocuments({ restaurantId: restaurant._id });
    
    if (menuItemCount === 0) {
      console.log('🌱 Seeding menu items...');
      const sampleMenuItems = [
        {
          restaurantId: restaurant._id,
          name: 'Margherita Pizza',
          description: 'Classic tomato sauce, mozzarella, and fresh basil',
          price: 12.99,
          category: 'Pizza',
          ingredients: ['tomato sauce', 'mozzarella', 'basil', 'olive oil'],
          allergens: ['dairy', 'gluten'],
          preparationTime: 15
        },
        {
          restaurantId: restaurant._id,
          name: 'Caesar Salad',
          description: 'Crisp romaine lettuce with caesar dressing and croutons',
          price: 8.99,
          category: 'Salad',
          ingredients: ['romaine lettuce', 'caesar dressing', 'croutons', 'parmesan'],
          allergens: ['dairy', 'gluten', 'eggs'],
          preparationTime: 10
        },
        {
          restaurantId: restaurant._id,
          name: 'Grilled Salmon',
          description: 'Fresh Atlantic salmon with lemon herb butter',
          price: 18.99,
          category: 'Main Course',
          ingredients: ['salmon', 'lemon', 'herbs', 'butter'],
          allergens: ['fish', 'dairy'],
          preparationTime: 20
        },
        {
          restaurantId: restaurant._id,
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
        { restaurantId: restaurant._id, number: 1, capacity: 2, location: 'Window side' },
        { restaurantId: restaurant._id, number: 2, capacity: 4, location: 'Center' },
        { restaurantId: restaurant._id, number: 3, capacity: 6, location: 'Back corner' },
        { restaurantId: restaurant._id, number: 4, capacity: 2, location: 'Window side' },
        { restaurantId: restaurant._id, number: 5, capacity: 8, location: 'Private area' },
        { restaurantId: restaurant._id, number: 6, capacity: 4, location: 'Center' }
      ];
      
      await Table.insertMany(sampleTables);
      console.log('✅ Tables seeded');
    }
    
    console.log('🎉 Database seeding completed!');
    console.log(`👑 Super admin email: ${superAdminEmail}`);
    console.log(`📧 Demo restaurant login: demo@restaurant.com / demo123`);
    console.log(`🔗 Restaurant slug: ${restaurant.slug}`);
  } catch (error) {
    console.log('⚠️ Error seeding data:', error instanceof Error ? error.message : String(error));
  }
};
