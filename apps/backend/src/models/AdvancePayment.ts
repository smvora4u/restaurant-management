import mongoose, { Schema, Document } from 'mongoose';

export interface IAdvancePayment extends Document {
  staffId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  amount: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other';
  paymentTransactionId?: string;
  paidAt?: Date;
  notes?: string;
  isSettled: boolean; // Whether this advance has been deducted from salary
  settledAt?: Date; // When it was settled
  settledByPaymentId?: mongoose.Types.ObjectId; // Which salary payment settled this
  createdBy: 'admin' | 'restaurant';
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdvancePaymentSchema = new Schema<IAdvancePayment>({
  staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  amount: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed'], 
    default: 'paid' // Advance payments are typically paid immediately
  },
  paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer', 'other'] },
  paymentTransactionId: { type: String },
  paidAt: { type: Date, default: Date.now },
  notes: { type: String },
  isSettled: { type: Boolean, default: false },
  settledAt: { type: Date },
  settledByPaymentId: { type: Schema.Types.ObjectId, ref: 'SalaryPayment' },
  createdBy: { type: String, enum: ['admin', 'restaurant'], required: true },
  createdById: { type: String, required: true },
}, { timestamps: true });

// Index for staff advance queries
AdvancePaymentSchema.index({ staffId: 1, createdAt: -1 });
// Index for restaurant queries
AdvancePaymentSchema.index({ restaurantId: 1, createdAt: -1 });
// Index for unsettled advances
AdvancePaymentSchema.index({ staffId: 1, isSettled: 1, paymentStatus: 'paid' });

export default mongoose.model<IAdvancePayment>('AdvancePayment', AdvancePaymentSchema);

