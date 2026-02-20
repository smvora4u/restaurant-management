import mongoose from 'mongoose';

/**
 * Migrate table number and tableNumber fields from Number to String.
 * Converts Table.number, Order.tableNumber, Reservation.tableNumber.
 *
 * Idempotent: safe to run multiple times. Skips documents already converted.
 * Runs on every deploy; after first run finds 0 documents to convert.
 */
export const migrateTableNumberToString = async () => {
  if (process.env.RUN_MIGRATIONS === 'false') {
    console.log('⏭️  Skipping table number migration (RUN_MIGRATIONS=false)');
    return;
  }

  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.log('⏭️  MongoDB not connected, skipping table number migration');
      return;
    }

    let totalConverted = 0;

    // Tables: convert number (Number) to number (String)
    const tablesCollection = db.collection('tables');
    const tablesResult = await tablesCollection.updateMany(
      { number: { $type: 'number' } },
      [{ $set: { number: { $convert: { input: '$number', to: 'string' } } } }]
    );
    if (tablesResult.modifiedCount > 0) {
      console.log(`📋 Converted Table.number for ${tablesResult.modifiedCount} table(s)`);
      totalConverted += tablesResult.modifiedCount;
    }

    // Orders: convert tableNumber (Number) to tableNumber (String)
    const ordersCollection = db.collection('orders');
    const ordersResult = await ordersCollection.updateMany(
      { tableNumber: { $type: 'number' } },
      [{ $set: { tableNumber: { $convert: { input: '$tableNumber', to: 'string' } } } }]
    );
    if (ordersResult.modifiedCount > 0) {
      console.log(`📋 Converted Order.tableNumber for ${ordersResult.modifiedCount} order(s)`);
      totalConverted += ordersResult.modifiedCount;
    }

    // Reservations: convert tableNumber (Number) to tableNumber (String)
    const reservationsCollection = db.collection('reservations');
    const reservationsResult = await reservationsCollection.updateMany(
      { tableNumber: { $type: 'number' } },
      [{ $set: { tableNumber: { $convert: { input: '$tableNumber', to: 'string' } } } }]
    );
    if (reservationsResult.modifiedCount > 0) {
      console.log(`📋 Converted Reservation.tableNumber for ${reservationsResult.modifiedCount} reservation(s)`);
      totalConverted += reservationsResult.modifiedCount;
    }

    if (totalConverted === 0) {
      console.log('✅ No documents need table number migration');
    } else {
      console.log(`✅ Table number migration complete: ${totalConverted} document(s) converted`);
    }
  } catch (error) {
    console.error('❌ Error migrating table numbers:', error);
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    console.log('⚠️  Continuing server startup despite migration error');
  }
};
