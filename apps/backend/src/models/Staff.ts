import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IStaff {
  _id?: string;
  name: string;
  email: string;
  password: string;
  restaurantId: mongoose.Types.ObjectId;
  role: 'manager' | 'waiter' | 'kitchen_staff' | 'cashier';
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address']
  },
  password: { type: String, required: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  role: { 
    type: String, 
    enum: ['manager', 'waiter', 'kitchen_staff', 'cashier'], 
    default: 'waiter' 
  },
  permissions: [{
    type: String,
    enum: ['manage_orders', 'view_orders', 'update_order_status', 'view_kitchen']
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving - DISABLED to avoid conflicts
// StaffSchema.pre('save', async function(next) {
//   if (this.isModified('password')) {
//     // Password is already SHA256-hashed from frontend, so we only need bcrypt
//     this.password = await bcrypt.hash(this.password, 10);
//   }
//   next();
// });

// Update the updatedAt field before saving
StaffSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create index for email and restaurantId for faster queries
StaffSchema.index({ email: 1, restaurantId: 1 }, { unique: true });

export default mongoose.model<IStaff>('Staff', StaffSchema);
