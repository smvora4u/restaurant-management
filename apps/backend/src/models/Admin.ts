import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAdmin {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'platform_admin' | 'support_admin';
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['super_admin', 'platform_admin', 'support_admin'], 
    default: 'platform_admin' 
  },
  permissions: [{
    type: String,
    enum: ['manage_restaurants', 'view_analytics', 'manage_users', 'system_settings', 'view_all_data']
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
AdminSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    // First hash with SHA256, then bcrypt for double security
    const crypto = await import('crypto');
    const sha256Hash = crypto.createHash('sha256').update(this.password).digest('hex');
    this.password = await bcrypt.hash(sha256Hash, 10);
  }
  next();
});

// Update the updatedAt field before saving
AdminSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IAdmin>('Admin', AdminSchema);
