import { Document, Types } from 'mongoose';

// Base interfaces
export interface IAdmin extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'platform_admin' | 'support_admin';
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRestaurant extends Document {
  _id: Types.ObjectId;
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

export interface IMenuItem extends Document {
  restaurantId: Types.ObjectId;
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
  restaurantId: Types.ObjectId;
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
  restaurantId: Types.ObjectId;
  name: string;
  mobileNumber: string;
  email?: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrder extends Document {
  restaurantId: Types.ObjectId;
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
  restaurantId: Types.ObjectId;
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
export interface AdminInput {
  name: string;
  email: string;
  password: string;
  role?: 'super_admin' | 'platform_admin' | 'support_admin';
  permissions?: string[];
}

export interface RestaurantInput {
  name: string;
  email: string;
  password: string;
  slug?: string;
  address?: string;
  phone?: string;
  settings?: {
    currency?: string;
    timezone?: string;
    theme?: any;
  };
}

export interface MenuItemInput {
  restaurantId: string;
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
  restaurantId: string;
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
  restaurantId: string;
  name: string;
  mobileNumber: string;
  email?: string;
  sessionId?: string;
}

export interface OrderInput {
  restaurantId: string;
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
  restaurantId: string;
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
  restaurant?: {
    id: string;
    email: string;
    slug: string;
  };
  admin?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}
