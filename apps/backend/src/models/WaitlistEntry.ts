import mongoose, { Schema } from 'mongoose';
import { IWaitlistEntry } from '../types/index.js';

const WaitlistEntrySchema = new Schema<IWaitlistEntry>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  partySize: { type: Number, required: true },
  notes: String,
  status: {
    type: String,
    enum: ['waiting', 'notified', 'seated', 'cancelled', 'no_show'],
    default: 'waiting'
  },
  queuePosition: { type: Number, required: true },
  notifiedAt: Date,
  seatedAt: Date,
  assignedTableNumber: String,
  normalizedPhone: { type: String, required: false },
  createdAt: { type: Date, default: Date.now }
});

WaitlistEntrySchema.index({ restaurantId: 1, status: 1 });
WaitlistEntrySchema.index({ restaurantId: 1, normalizedPhone: 1, status: 1 });

export default mongoose.model<IWaitlistEntry>('WaitlistEntry', WaitlistEntrySchema);
