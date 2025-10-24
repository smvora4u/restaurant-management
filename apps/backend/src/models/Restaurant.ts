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
    theme: Schema.Types.Mixed
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
RestaurantSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    // First hash with SHA256, then bcrypt for double security
    const crypto = await import('crypto');
    const sha256Hash = crypto.createHash('sha256').update(this.password).digest('hex');
    this.password = await bcrypt.hash(sha256Hash, 10);
  }
  next();
});

// Update the updatedAt field before saving
RestaurantSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);
