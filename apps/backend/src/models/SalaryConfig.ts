import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryConfig extends Document {
  staffId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  salaryType: 'fixed' | 'hourly' | 'mixed';
  baseSalary?: number; // For fixed salary or base in mixed
  hourlyRate?: number; // For hourly or mixed
  currency: string;
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly';
  effectiveDate: Date;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryConfigSchema = new Schema<ISalaryConfig>({
  staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  salaryType: { 
    type: String, 
    enum: ['fixed', 'hourly', 'mixed'], 
    required: true 
  },
  baseSalary: { type: Number },
  hourlyRate: { type: Number },
  currency: { type: String, required: true, default: 'USD' },
  paymentFrequency: { 
    type: String, 
    enum: ['weekly', 'biweekly', 'monthly'], 
    required: true,
    default: 'monthly'
  },
  effectiveDate: { type: Date, required: true, default: Date.now },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Index for finding active salary config for a staff member
SalaryConfigSchema.index({ staffId: 1, isActive: 1 });
// Index for restaurant queries
SalaryConfigSchema.index({ restaurantId: 1, createdAt: -1 });
// Ensure one active config per staff at a time (enforced in application logic)
SalaryConfigSchema.index({ staffId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export default mongoose.model<ISalaryConfig>('SalaryConfig', SalaryConfigSchema);

