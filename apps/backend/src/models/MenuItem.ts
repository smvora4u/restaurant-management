import mongoose, { Schema } from 'mongoose';
import { IMenuItem } from '../types/index.js';

const MenuItemSchema = new Schema<IMenuItem>({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: { type: String, required: true },
  available: { type: Boolean, default: true },
  imageUrl: String,
  ingredients: [String],
  allergens: [String],
  preparationTime: Number, // in minutes
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
MenuItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
