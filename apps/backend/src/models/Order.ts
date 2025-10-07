import mongoose, { Schema } from 'mongoose';
import { IOrder, IOrderItem } from '../types/index.js';

const OrderItemSchema = new Schema<IOrderItem>({
  menuItemId: { type: String, required: true },
  quantity: { type: Number, required: true },
  specialInstructions: String,
  price: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'], 
    default: 'pending' 
  }
});

const OrderSchema = new Schema<IOrder>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableNumber: { type: Number, required: false },
  orderType: { 
    type: String, 
    enum: ['dine-in', 'takeout', 'delivery'], 
    required: true,
    default: 'dine-in'
  },
  items: [OrderItemSchema],
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  totalAmount: { type: Number, required: true },
  customerName: String,
  customerPhone: String,
  notes: String,
  sessionId: String,
  userId: String,
  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  paymentMethod: { type: String, enum: ['cash', 'card', 'online', 'bank_transfer'], required: false },
  paymentTransactionId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
OrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IOrder>('Order', OrderSchema);
