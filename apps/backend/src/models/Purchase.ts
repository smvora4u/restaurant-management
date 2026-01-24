import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchase extends Document {
  restaurantId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  purchaseDate: Date;
  totalAmount: number;
  currency: string;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  paymentMethod?: 'cash' | 'card' | 'online' | 'bank_transfer';
  paymentTransactionId?: string;
  paidAt?: Date;
  invoiceNumber?: string;
  notes?: string;
  createdBy: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
  purchaseDate: { type: Date, required: true, default: Date.now },
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'USD' },
  paymentStatus: { 
    type: String, 
    enum: ['paid', 'unpaid', 'partial'], 
    required: true, 
    default: 'unpaid' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'card', 'online', 'bank_transfer'] 
  },
  paymentTransactionId: { type: String },
  paidAt: { type: Date },
  invoiceNumber: { type: String },
  notes: { type: String },
  createdBy: { type: String, required: true },
  createdById: { type: String, required: true },
}, { timestamps: true });

// Indexes
PurchaseSchema.index({ restaurantId: 1, purchaseDate: -1 });
PurchaseSchema.index({ vendorId: 1 });
PurchaseSchema.index({ paymentStatus: 1 });
PurchaseSchema.index({ restaurantId: 1, paymentStatus: 1 });

export default mongoose.model<IPurchase>('Purchase', PurchaseSchema);


