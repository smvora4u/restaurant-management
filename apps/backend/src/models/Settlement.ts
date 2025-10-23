import mongoose, { Schema, Document } from 'mongoose';

export interface ISettlement extends Document {
  restaurantId: string;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  totalOrders: number;
  totalOrderAmount: number;
  totalFees: number;
  generatedAt: Date;
}

const SettlementSchema = new Schema<ISettlement>({
  restaurantId: { type: String, required: true },
  currency: { type: String, required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  totalOrders: { type: Number, required: true },
  totalOrderAmount: { type: Number, required: true },
  totalFees: { type: Number, required: true },
  generatedAt: { type: Date, default: () => new Date() },
}, { timestamps: false });

SettlementSchema.index({ restaurantId: 1, periodStart: -1 });
SettlementSchema.index({ periodStart: -1, periodEnd: -1 });

const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);
export default Settlement;


