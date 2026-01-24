import { Purchase } from '../models/index.js';

/**
 * Backfill purchaseDate for existing purchases that are missing or invalid.
 * Uses createdAt as the purchaseDate for old purchases.
 *
 * This migration is idempotent and safe to run multiple times.
 * In production, it can be controlled via RUN_MIGRATIONS environment variable.
 */
export const backfillPurchaseDate = async () => {
  // Skip migration if RUN_MIGRATIONS is explicitly set to false
  if (process.env.RUN_MIGRATIONS === 'false') {
    console.log('⏭️  Skipping purchaseDate backfill (RUN_MIGRATIONS=false)');
    return;
  }

  try {
    const invalidDateTypes = ['string', 'double', 'int', 'long'] as const;
    const purchases = await Purchase.find({
      $or: [
        { purchaseDate: { $exists: false } },
        { purchaseDate: null },
        { purchaseDate: { $type: invalidDateTypes } }
      ]
    }).lean();

    if (purchases.length === 0) {
      console.log('✅ No purchases need purchaseDate backfill');
      return;
    }

    console.log(`📋 Found ${purchases.length} purchase(s) with missing/invalid purchaseDate`);

    const bulkOps = purchases.map((purchase: any) => ({
      updateOne: {
        filter: { _id: purchase._id },
        update: {
          $set: {
            purchaseDate: purchase.createdAt || new Date()
          }
        }
      }
    }));

    const result = await Purchase.bulkWrite(bulkOps);

    if (result.matchedCount === 0) {
      console.log('✅ No purchases need purchaseDate backfill');
      return;
    }

    console.log(`✅ Successfully backfilled purchaseDate for ${result.modifiedCount} purchase(s)`);
  } catch (error) {
    console.error('❌ Error backfilling purchaseDate:', error);

    // Only throw in development to help catch issues early
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }

    console.log('⚠️  Continuing server startup despite migration error');
  }
};
