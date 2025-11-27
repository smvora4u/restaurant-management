import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseItem extends Document {
  purchaseId: mongoose.Types.ObjectId;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  categoryId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>({
  purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase', required: true },
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, default: 'piece' },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  categoryId: { type: Schema.Types.ObjectId, ref: 'PurchaseCategory' },
  notes: { type: String },
}, { timestamps: true });

// Index for purchase queries
PurchaseItemSchema.index({ purchaseId: 1 });

export default mongoose.model<IPurchaseItem>('PurchaseItem', PurchaseItemSchema);

