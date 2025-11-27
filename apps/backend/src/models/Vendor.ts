import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Index for uniqueness per restaurant
VendorSchema.index({ restaurantId: 1, name: 1 }, { unique: true });
// Index for restaurant queries
VendorSchema.index({ restaurantId: 1, isActive: 1 });

export default mongoose.model<IVendor>('Vendor', VendorSchema);

