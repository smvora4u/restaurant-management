import { Document } from 'mongoose';

// Base interfaces
export interface IMenuItem extends Document {
  name: string;
  description?: string;
  price: number;
  category: string;
  available: boolean;
  imageUrl?: string;
  ingredients: string[];
  allergens: string[];
  preparationTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITable extends Document {
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  location?: string;
  createdAt: Date;
}

export interface IOrderItem {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  price: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
}

export interface IUser extends Document {
  name: string;
  mobileNumber: string;
  email?: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrder extends Document {
  tableNumber?: number;
  orderType: 'dine-in' | 'takeout' | 'delivery';
  items: IOrderItem[];
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  sessionId?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReservation extends Document {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  tableNumber: number;
  date: Date;
  time: string;
  partySize: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  specialRequests?: string;
  createdAt: Date;
}

// Input types for GraphQL mutations
export interface MenuItemInput {
  name: string;
  description?: string;
  price: number;
  category: string;
  available?: boolean;
  imageUrl?: string;
  ingredients?: string[];
  allergens?: string[];
  preparationTime?: number;
}

export interface TableInput {
  number: number;
  capacity: number;
  status?: string;
  location?: string;
}

export interface OrderItemInput {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  price: number;
  status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
}

export interface UserInput {
  name: string;
  mobileNumber: string;
  email?: string;
  sessionId?: string;
}

export interface OrderInput {
  tableNumber?: number;
  orderType: 'dine-in' | 'takeout' | 'delivery';
  items: OrderItemInput[];
  status?: string;
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  sessionId?: string;
  userId?: string;
}

export interface ReservationInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  tableNumber: number;
  date: string;
  time: string;
  partySize: number;
  status?: string;
  specialRequests?: string;
}

// GraphQL Context
export interface GraphQLContext {
  // Add any context properties here if needed
}
