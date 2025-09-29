import mongoose, { Schema } from 'mongoose';
import { IUser } from '../types/index.js';

const UserSchema = new Schema<IUser>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  email: String,
  sessionId: String, // For takeout orders - links user to session
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create index for mobile number and sessionId for faster queries
UserSchema.index({ mobileNumber: 1 });
UserSchema.index({ sessionId: 1 });

export default mongoose.model<IUser>('User', UserSchema);
