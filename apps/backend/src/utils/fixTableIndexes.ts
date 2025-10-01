import mongoose from 'mongoose';

export const fixTableIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const collection = db?.collection('tables');
    
    if (!collection) {
      console.log('❌ Tables collection not found');
      return;
    }

    // Get all existing indexes
    const indexes = await collection.indexes();
    console.log('📋 Current indexes:', indexes.map(idx => idx.name));

    // Drop the old simple index on number field if it exists
    try {
      await collection.dropIndex('number_1');
      console.log('✅ Dropped old number_1 index');
    } catch (error) {
      console.log('ℹ️ number_1 index not found or already dropped');
    }

    // Create the compound index
    try {
      await collection.createIndex({ restaurantId: 1, number: 1 }, { unique: true });
      console.log('✅ Created compound index on restaurantId and number');
    } catch (error) {
      console.log('ℹ️ Compound index already exists');
    }

    // Verify the final indexes
    const finalIndexes = await collection.indexes();
    console.log('📋 Final indexes:', finalIndexes.map(idx => idx.name));
    
  } catch (error) {
    console.error('❌ Error fixing table indexes:', error);
  }
};
