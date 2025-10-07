import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurantFeeConfig extends Document {
  restaurantId: string;
  mode: 'fixed' | 'percentage';
  amount: number; // fixed amount or percentage value (e.g., 10 for 10%)
  freeOrdersRemaining: number; // number of orders left with zero platform fee
  createdAt: Date;
  updatedAt: Date;
}

const RestaurantFeeConfigSchema = new Schema<IRestaurantFeeConfig>(
  {
    restaurantId: { type: String, required: true, index: true },
    mode: { type: String, enum: ['fixed', 'percentage'], required: true },
    amount: { type: Number, required: true },
    freeOrdersRemaining: { type: Number, default: 0 },
  },
  { timestamps: true }
);

RestaurantFeeConfigSchema.index({ restaurantId: 1 }, { unique: true });

const RestaurantFeeConfig = mongoose.model<IRestaurantFeeConfig>('RestaurantFeeConfig', RestaurantFeeConfigSchema);
export default RestaurantFeeConfig;


