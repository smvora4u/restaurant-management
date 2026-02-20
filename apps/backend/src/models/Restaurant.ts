import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IRestaurant {
  _id?: string;
  name: string;
  slug: string;
  email: string;
  password: string;
  address?: string;
  phone?: string;
  settings: {
    currency: string;
    timezone: string;
    theme?: any;
    billSize?: '58mm' | '80mm';
    networkPrinter?: { host: string; port: number };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RestaurantSchema = new Schema<IRestaurant>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: String,
  phone: String,
  settings: {
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC' },
    theme: Schema.Types.Mixed,
    billSize: { type: String, default: '80mm', enum: ['58mm', '80mm'] },
    networkPrinter: {
      host: { type: String },
      port: { type: Number }
    }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving - DISABLED to avoid conflicts
// RestaurantSchema.pre('save', async function(next) {
//   if (this.isModified('password')) {
//     // Password is already SHA256-hashed from frontend, so we only need bcrypt
//     this.password = await bcrypt.hash(this.password, 10);
//   }
//   next();
// });

// Update the updatedAt field before saving
RestaurantSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);
