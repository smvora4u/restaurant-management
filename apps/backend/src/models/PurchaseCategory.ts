import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseCategory extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseCategorySchema = new Schema<IPurchaseCategory>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Index for uniqueness per restaurant
PurchaseCategorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });
// Index for restaurant queries
PurchaseCategorySchema.index({ restaurantId: 1, isActive: 1 });

export default mongoose.model<IPurchaseCategory>('PurchaseCategory', PurchaseCategorySchema);


