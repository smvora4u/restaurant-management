import mongoose from 'mongoose';
import { SalaryPayment } from '../models/index.js';

/**
 * Backfill paidAt field for existing salary payments that have status 'paid' but no paidAt date
 * Uses createdAt as the paidAt date for old payments
 * 
 * This migration is idempotent and safe to run multiple times.
 * In production, it can be controlled via RUN_MIGRATIONS environment variable.
 */
export const backfillPaidAt = async () => {
  // Skip migration if RUN_MIGRATIONS is explicitly set to false
  if (process.env.RUN_MIGRATIONS === 'false') {
    console.log('⏭️  Skipping paidAt backfill (RUN_MIGRATIONS=false)');
    return;
  }

  try {
    // Find payments that need backfilling
    const payments = await SalaryPayment.find({
      paymentStatus: 'paid',
      $or: [
        { paidAt: { $exists: false } },
        { paidAt: null }
      ]
    }).lean();

    if (payments.length === 0) {
      console.log('✅ No payments need paidAt backfill');
      return;
    }

    console.log(`📋 Found ${payments.length} payment(s) without paidAt date`);

    // Use bulk write for better performance in production
    const bulkOps = payments.map(payment => ({
      updateOne: {
        filter: { _id: payment._id },
        update: {
          $set: {
            paidAt: payment.createdAt || new Date()
          }
        }
      }
    }));

    const result = await SalaryPayment.bulkWrite(bulkOps);

    if (result.matchedCount === 0) {
      console.log('✅ No payments need paidAt backfill');
      return;
    }

    console.log(`✅ Successfully backfilled paidAt for ${result.modifiedCount} payment(s)`);
  } catch (error) {
    // In production, log error but don't crash the server
    // The migration can be run manually later if needed
    console.error('❌ Error backfilling paidAt:', error);
    
    // Only throw in development to help catch issues early
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    
    console.log('⚠️  Continuing server startup despite migration error');
  }
};

