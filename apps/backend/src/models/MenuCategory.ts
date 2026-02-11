import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuCategory extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  parentCategoryId?: mongoose.Types.ObjectId;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MenuCategorySchema = new Schema<IMenuCategory>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  parentCategoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', default: null },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Unique category name per restaurant within same parent (allows "Dosa" and "Paper Dosa" under Dosa)
MenuCategorySchema.index({ restaurantId: 1, parentCategoryId: 1, name: 1 }, { unique: true });
MenuCategorySchema.index({ restaurantId: 1, isActive: 1 });
MenuCategorySchema.index({ restaurantId: 1, parentCategoryId: 1 });

export default mongoose.model<IMenuCategory>('MenuCategory', MenuCategorySchema);
