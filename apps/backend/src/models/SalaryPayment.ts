import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryPayment extends Document {
  staffId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  paymentPeriodStart: Date;
  paymentPeriodEnd: Date;
  baseAmount: number; // Base salary amount (for fixed) or hourly calculation
  hoursWorked?: number; // For hourly or mixed salary types
  hourlyRate?: number; // Snapshot of hourly rate at payment time
  bonusAmount?: number; // Bonuses
  deductionAmount?: number; // Deductions
  advanceDeduction?: number; // Advance payments deducted from this salary
  totalAmount: number; // Final calculated amount
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other';
  paymentTransactionId?: string;
  paidAt?: Date;
  notes?: string;
  createdBy: 'admin' | 'restaurant';
  createdById: string; // ID of admin or restaurant who created this
  createdAt: Date;
  updatedAt: Date;
}

const SalaryPaymentSchema = new Schema<ISalaryPayment>({
  staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  paymentPeriodStart: { type: Date, required: true },
  paymentPeriodEnd: { type: Date, required: true },
  baseAmount: { type: Number, required: true, default: 0 },
  hoursWorked: { type: Number },
  hourlyRate: { type: Number },
  bonusAmount: { type: Number, default: 0 },
  deductionAmount: { type: Number, default: 0 },
  advanceDeduction: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed'], 
    default: 'pending' 
  },
  paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer', 'other'] },
  paymentTransactionId: { type: String },
  paidAt: { type: Date },
  notes: { type: String },
  createdBy: { type: String, enum: ['admin', 'restaurant'], required: true },
  createdById: { type: String, required: true },
}, { timestamps: true });

// Index for staff payment history queries
SalaryPaymentSchema.index({ staffId: 1, createdAt: -1 });
// Index for restaurant payment queries
SalaryPaymentSchema.index({ restaurantId: 1, createdAt: -1 });
// Index for payment status filtering
SalaryPaymentSchema.index({ restaurantId: 1, paymentStatus: 1, createdAt: -1 });
// Index for payment period queries
SalaryPaymentSchema.index({ staffId: 1, paymentPeriodStart: 1, paymentPeriodEnd: 1 });

export default mongoose.model<ISalaryPayment>('SalaryPayment', SalaryPaymentSchema);

