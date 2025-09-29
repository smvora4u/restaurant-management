import mongoose, { Schema } from 'mongoose';
import { IReservation } from '../types/index.js';

const ReservationSchema = new Schema<IReservation>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: String,
  tableNumber: { type: Number, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  partySize: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['confirmed', 'cancelled', 'completed'], 
    default: 'confirmed' 
  },
  specialRequests: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IReservation>('Reservation', ReservationSchema);
