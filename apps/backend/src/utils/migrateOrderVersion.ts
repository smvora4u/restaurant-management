import mongoose from 'mongoose';

/**
 * Add version field to orders for optimistic locking (race condition fix).
 * Sets version: 1 on orders that don't have it.
 *
 * Idempotent: safe to run multiple times. Skips orders that already have version.
 * Runs on every deploy; after first run finds 0 documents to update.
 */
export const migrateOrderVersion = async () => {
  if (process.env.RUN_MIGRATIONS === 'false') {
    console.log('⏭️  Skipping order version migration (RUN_MIGRATIONS=false)');
    return;
  }

  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.log('⏭️  MongoDB not connected, skipping order version migration');
      return;
    }

    const ordersCollection = db.collection('orders');
    const result = await ordersCollection.updateMany(
      { version: { $exists: false } },
      { $set: { version: 1 } }
    );

    if (result.modifiedCount > 0) {
      console.log(`📋 Added version to ${result.modifiedCount} order(s)`);
      console.log(`✅ Order version migration complete`);
    } else {
      console.log('✅ No orders need version migration');
    }
  } catch (error) {
    console.error('❌ Error migrating order version:', error);
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    console.log('⚠️  Continuing server startup despite migration error');
  }
};
