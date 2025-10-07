import mongoose, { Schema, Document } from 'mongoose';

export interface IFeeLedger extends Document {
  restaurantId: string;
  orderId: string;
  orderTotal: number;
  feeMode: 'fixed' | 'percentage';
  feeRate: number; // fixed or percentage value
  feeAmount: number; // computed with banker rounding
  currency: string;
  discountApplied: boolean;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'card' | 'bank_transfer' | 'cash' | 'other';
  paymentTransactionId?: string;
  paidAt?: Date;
  createdAt: Date;
}

const FeeLedgerSchema = new Schema<IFeeLedger>({
  restaurantId: { type: String, index: true, required: true },
  orderId: { type: String, index: true, required: true },
  orderTotal: { type: Number, required: true },
  feeMode: { type: String, enum: ['fixed', 'percentage'], required: true },
  feeRate: { type: Number, required: true },
  feeAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  discountApplied: { type: Boolean, default: false },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: { type: String, enum: ['card', 'bank_transfer', 'cash', 'other'] },
  paymentTransactionId: { type: String },
  paidAt: { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });

FeeLedgerSchema.index({ restaurantId: 1, createdAt: -1 });
// Ensure one ledger entry per order per restaurant
FeeLedgerSchema.index({ restaurantId: 1, orderId: 1 }, { unique: true });

const FeeLedger = mongoose.model<IFeeLedger>('FeeLedger', FeeLedgerSchema);
export default FeeLedger;


