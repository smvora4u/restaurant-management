#!/usr/bin/env node
/**
 * Standalone migration script for backfilling paidAt dates
 * 
 * Usage:
 *   npm run migration:backfill-paidat
 *   or
 *   tsx src/scripts/runMigration.ts
 * 
 * This script can be run manually in production without starting the full server.
 */

import 'dotenv/config';
import { connectMongo } from '../config/database.js';
import { backfillPaidAt } from '../utils/backfillPaidAt.js';

async function runMigration() {
  try {
    console.log('🚀 Starting paidAt backfill migration...');
    
    // Connect to MongoDB
    await connectMongo();
    console.log('✅ Connected to MongoDB');
    
    // Run the migration
    await backfillPaidAt();
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();


