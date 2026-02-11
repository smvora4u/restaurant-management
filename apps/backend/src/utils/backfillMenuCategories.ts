import mongoose from 'mongoose';
import { MenuItem, MenuCategory } from '../models/index.js';

/**
 * Backfill categoryId for menu items that have legacy category string but no categoryId.
 * Creates MenuCategory records from distinct category strings per restaurant, then links items.
 *
 * Idempotent: safe to run multiple times. Skips items that already have categoryId.
 * Uniqueness: (restaurantId, parentCategoryId, name) - top-level categories use parentCategoryId=null.
 */
export const backfillMenuCategories = async () => {
  if (process.env.RUN_MIGRATIONS === 'false') {
    console.log('⏭️  Skipping menu categories backfill (RUN_MIGRATIONS=false)');
    return;
  }

  try {
    const itemsNeedingBackfill = await MenuItem.find({
      $or: [
        { categoryId: { $exists: false } },
        { categoryId: null }
      ],
      category: { $exists: true, $nin: [null, ''] }
    }).lean();

    if (itemsNeedingBackfill.length === 0) {
      console.log('✅ No menu items need categoryId backfill');
      return;
    }

    console.log(`📋 Found ${itemsNeedingBackfill.length} menu item(s) with legacy category to backfill`);

    const byRestaurant = new Map<string, Map<string, mongoose.Types.ObjectId>>();
    let created = 0;
    let updated = 0;

    for (const item of itemsNeedingBackfill) {
      const restaurantId = item.restaurantId?.toString();
      const categoryName = (item.category as string)?.trim();
      if (!restaurantId || !categoryName) continue;

      if (!byRestaurant.has(restaurantId)) {
        byRestaurant.set(restaurantId, new Map());
      }
      const catMap = byRestaurant.get(restaurantId)!;

      let categoryId: mongoose.Types.ObjectId | undefined = catMap.get(categoryName);
      if (!categoryId) {
        const existing = await MenuCategory.findOne({
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          parentCategoryId: null,
          name: categoryName
        });
        if (existing) {
          categoryId = existing._id as mongoose.Types.ObjectId;
        } else {
          const newCat = await MenuCategory.create({
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
            name: categoryName,
            parentCategoryId: null,
            sortOrder: 0,
            isActive: true
          });
          categoryId = newCat._id as mongoose.Types.ObjectId;
          created++;
        }
        catMap.set(categoryName, categoryId);
      }

      await MenuItem.updateOne(
        { _id: item._id },
        { $set: { categoryId: categoryId! } }
      );
      updated++;
    }

    console.log(`✅ Backfill complete: created ${created} categories, updated ${updated} menu items`);
  } catch (error) {
    console.error('❌ Error backfilling menu categories:', error);
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    console.log('⚠️  Continuing server startup despite migration error');
  }
};
