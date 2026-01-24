#!/usr/bin/env node
/**
 * Standalone migration script for backfilling purchaseDate values
 *
 * Usage:
 *   npm run migration:backfill-purchase-date
 *   or
 *   tsx src/scripts/runPurchaseDateMigration.ts
 *
 * This script can be run manually in production without starting the full server.
 */

import 'dotenv/config';
import { connectMongo } from '../config/database.js';
import { backfillPurchaseDate } from '../utils/backfillPurchaseDate.js';

async function runMigration() {
  try {
    console.log('🚀 Starting purchaseDate backfill migration...');

    // Connect to MongoDB
    await connectMongo();
    console.log('✅ Connected to MongoDB');

    // Run the migration
    await backfillPurchaseDate();

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
