#!/usr/bin/env node
/**
 * Standalone migration script for backfilling menu categoryId from legacy category strings
 *
 * Usage:
 *   npm run migration:backfill-menu-categories
 *   or
 *   tsx src/scripts/runMenuCategoriesMigration.ts
 */

import 'dotenv/config';
import { connectMongo } from '../config/database.js';
import { backfillMenuCategories } from '../utils/backfillMenuCategories.js';

async function runMigration() {
  try {
    console.log('🚀 Starting menu categories backfill migration...');

    await connectMongo();
    console.log('✅ Connected to MongoDB');

    await backfillMenuCategories();

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
