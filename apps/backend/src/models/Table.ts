import mongoose, { Schema } from 'mongoose';
import { ITable } from '../types/index.js';

const TableSchema = new Schema<ITable>({
  number: { type: Number, required: true, unique: true },
  capacity: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'reserved', 'cleaning'], 
    default: 'available' 
  },
  location: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ITable>('Table', TableSchema);
