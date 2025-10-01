import mongoose, { Schema } from 'mongoose';
import { ITable } from '../types/index.js';

const TableSchema = new Schema<ITable>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  number: { type: Number, required: true },
  capacity: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'reserved', 'cleaning'], 
    default: 'available' 
  },
  location: String,
  createdAt: { type: Date, default: Date.now }
});

// Create compound index for restaurantId and number to ensure uniqueness per restaurant
TableSchema.index({ restaurantId: 1, number: 1 }, { unique: true });

export default mongoose.model<ITable>('Table', TableSchema);