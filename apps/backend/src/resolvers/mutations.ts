import { MenuItem, Table, Order, Reservation, User, RestaurantFeeConfig, FeeLedger, Settlement } from '../models/index.js';
import { GraphQLContext } from '../types/index.js';
import { publishOrderUpdated, publishOrderItemStatusUpdated, publishNewOrder, publishFeeLedgerUpdated, publishPaymentStatusUpdated, publishDueFeesUpdated } from './subscriptions.js';

export const mutationResolvers = {
  // Menu Item mutations
  createMenuItem: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const menuItem = new MenuItem({ ...input, restaurantId: context.restaurant.id });
    return await menuItem.save();
  },
  updateMenuItem: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await MenuItem.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id }, 
      { ...input, restaurantId: context.restaurant.id, updatedAt: new Date() }, 
      { new: true }
    );
  },
  deleteMenuItem: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const result = await MenuItem.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
  
  // Table mutations
  createTable: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const table = new Table({ ...input, restaurantId: context.restaurant.id });
    return await table.save();
  },
  updateTable: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Table.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id }, 
      input, 
      { new: true }
    );
  },
  deleteTable: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const result = await Table.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
  
  // User mutations
  createUser: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const user = new User({ ...input, restaurantId: context.restaurant.id });
    return await user.save();
  },
  updateUser: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await User.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id }, 
      { ...input, updatedAt: new Date() }, 
      { new: true }
    );
  },
  deleteUser: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const result = await User.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
  
  // Order mutations
  createOrder: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }

    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    
    // Validate table availability for dine-in orders
    if (input.orderType === 'dine-in' && input.tableNumber) {
      // Check if table exists
      const table = await Table.findOne({ 
        number: input.tableNumber, 
        restaurantId: restaurantId 
      });
      
      if (!table) {
        throw new Error(`Table ${input.tableNumber} does not exist`);
      }

      // Check if table already has an active order
      const existingOrder = await Order.findOne({
        restaurantId: restaurantId,
        tableNumber: input.tableNumber,
        orderType: 'dine-in',
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
      });

      if (existingOrder) {
        throw new Error(`Table ${input.tableNumber} already has an active order`);
      }
    }

    // Validate menu items exist and are available
    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const menuItem = await MenuItem.findOne({
          _id: item.menuItemId,
          restaurantId: restaurantId,
          available: true
        });
        
        if (!menuItem) {
          throw new Error(`Menu item ${item.menuItemId} not found or unavailable`);
        }
      }
    }

    const order = new Order({ 
      ...input, 
      restaurantId: restaurantId,
      status: input.status || 'pending'
    });
    
    const savedOrder = await order.save();
    await publishNewOrder(savedOrder);
    return savedOrder;
  },
  updateOrder: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id }, 
      { ...input, updatedAt: new Date() }, 
      { new: true }
    );
    if (updatedOrder) {
      await publishOrderUpdated(updatedOrder);
    }
    return updatedOrder;
  },
  markOrderPaid: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    const order = await Order.findOne({ _id: id, restaurantId });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'completed') {
      throw new Error('Only completed orders can be marked paid');
    }
    if (order.paid) return order; // idempotent

    order.paid = true as any;
    order.paidAt = new Date() as any;
    await order.save();

    // Compute platform fee
    const cfg = await RestaurantFeeConfig.findOne({ restaurantId });
    if (cfg) {
      let discountApplied = false;
      if (cfg.freeOrdersRemaining && cfg.freeOrdersRemaining > 0) {
        cfg.freeOrdersRemaining -= 1;
        discountApplied = true;
        await cfg.save();
      }
      const currency = 'USD'; // fallback; optional: fetch from Restaurant settings if available
      const total = order.totalAmount;
      let feeAmount = 0;
      if (!discountApplied) {
        if (cfg.mode === 'fixed') {
          feeAmount = cfg.amount;
        } else {
          // percentage of gross
          const raw = (total * cfg.amount) / 100;
          // Banker's rounding to 2 decimals
          const factor = 100;
          const n = raw * factor;
          const floor = Math.floor(n);
          const frac = n - floor;
          const isHalf = Math.abs(frac - 0.5) < 1e-8;
          const rounded = isHalf ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(n);
          feeAmount = rounded / factor;
        }
      }
      const feeLedger = await FeeLedger.create({
        restaurantId,
        orderId: id,
        orderTotal: total,
        feeMode: cfg.mode,
        feeRate: cfg.amount,
        feeAmount,
        currency,
        discountApplied,
        paymentStatus: 'pending', // Platform fees are always pending until restaurant pays them
        paidAt: undefined // Will be set when restaurant actually pays the platform fees
      });

      // Publish fee ledger updated event
      await publishFeeLedgerUpdated(feeLedger);
      
      // Publish due fees updated event
      await publishDueFeesUpdated(restaurantId);
    }

    return order;
  },
  setRestaurantFeeConfig: async (_: any, { restaurantId, mode, amount, freeOrdersRemaining }: any, context: GraphQLContext) => {
    if (!context.admin) throw new Error('Admin authentication required');
    if (!['fixed', 'percentage'].includes(mode)) throw new Error('Invalid mode');
    const update = { mode, amount, freeOrdersRemaining: freeOrdersRemaining ?? 0 };
    const cfg = await RestaurantFeeConfig.findOneAndUpdate({ restaurantId }, update, { upsert: true, new: true });
    return cfg;
  },
  generateWeeklySettlement: async (_: any, { restaurantId, periodStart, periodEnd }: any, context: GraphQLContext) => {
    if (!context.admin) throw new Error('Admin authentication required');
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      throw new Error('Invalid period');
    }
    const ledgers = await FeeLedger.find({ restaurantId, createdAt: { $gte: start, $lt: end } });
    const totalOrders = ledgers.length;
    const totalOrderAmount = ledgers.reduce((s, l) => s + l.orderTotal, 0);
    const totalFees = ledgers.reduce((s, l) => s + l.feeAmount, 0);
    const currency = ledgers[0]?.currency || 'USD';
    const settlement = await Settlement.create({ restaurantId, currency, periodStart: start, periodEnd: end, totalOrders, totalOrderAmount, totalFees, generatedAt: new Date() });
    return settlement;
  },
  updateOrderItemStatus: async (_: any, { orderId, itemIndex, status }: { orderId: string; itemIndex: number; status: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const order = await Order.findOne({ _id: orderId, restaurantId: context.restaurant.id });
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (!order.items || itemIndex < 0 || itemIndex >= order.items.length) {
      throw new Error('Invalid item index');
    }
    
    // Update the specific item status
    if (order.items[itemIndex]) {
      order.items[itemIndex].status = status as any;
    }
    
    // Calculate overall order status based on item statuses
    const itemStatuses = order.items.map(item => item.status);
    if (itemStatuses.every(status => status === 'cancelled')) {
      order.status = 'cancelled';
    } else if (itemStatuses.every(status => status === 'served')) {
      order.status = 'completed';
    } else if (itemStatuses.some(status => status === 'served')) {
      order.status = 'served';
    } else if (itemStatuses.some(status => status === 'ready')) {
      order.status = 'ready';
    } else if (itemStatuses.some(status => status === 'preparing')) {
      order.status = 'preparing';
    } else if (itemStatuses.some(status => status === 'confirmed')) {
      order.status = 'confirmed';
    } else {
      order.status = 'pending';
    }
    
    order.updatedAt = new Date();
    const savedOrder = await order.save();
    await publishOrderItemStatusUpdated(savedOrder);
    return savedOrder;
  },
  deleteOrder: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const result = await Order.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
  
  // Reservation mutations
  createReservation: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const reservation = new Reservation({ ...input, restaurantId: context.restaurant.id });
    return await reservation.save();
  },
  updateReservation: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Reservation.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id }, 
      input, 
      { new: true }
    );
  },
  deleteReservation: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const result = await Reservation.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
  updateFeePaymentStatus: async (_: any, { feeLedgerId, paymentStatus, paymentMethod, paymentTransactionId, reason }: any, context: GraphQLContext) => {
    if (!context.admin) {
      throw new Error('Admin authentication required');
    }
    
    // Get the original fee ledger entry
    const originalFeeLedger = await FeeLedger.findById(feeLedgerId);
    if (!originalFeeLedger) {
      throw new Error('Fee ledger entry not found');
    }
    
    // Validate status transition
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['paid', 'failed'],
      'paid': ['refunded'],
      'failed': ['pending', 'paid'],
      'refunded': ['paid'] // Allow re-payment after refund
    };
    
    if (!validTransitions[originalFeeLedger.paymentStatus]?.includes(paymentStatus)) {
      throw new Error(`Invalid status transition from ${originalFeeLedger.paymentStatus} to ${paymentStatus}`);
    }
    
    const updateData: any = { paymentStatus };
    
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }
    
    if (paymentTransactionId) {
      updateData.paymentTransactionId = paymentTransactionId;
    }
    
    // If marking as paid, set paidAt to current time
    if (paymentStatus === 'paid') {
      updateData.paidAt = new Date();
    }
    
    const updatedFeeLedger = await FeeLedger.findByIdAndUpdate(
      feeLedgerId,
      updateData,
      { new: true }
    );
    
    // Create audit log for admin payment status change
    const { AuditLog } = await import('../models/index.js');
    const { publishAuditLogCreated } = await import('./subscriptions.js');
    
    await AuditLog.create({
      actorRole: 'admin',
      actorId: context.admin.id,
      action: 'UPDATE_FEE_PAYMENT_STATUS',
      entityType: 'FeeLedger',
      entityId: feeLedgerId,
      reason: reason || `Admin changed payment status from ${originalFeeLedger.paymentStatus} to ${paymentStatus}`,
      details: {
        restaurantId: originalFeeLedger.restaurantId,
        orderId: originalFeeLedger.orderId,
        originalStatus: originalFeeLedger.paymentStatus,
        newStatus: paymentStatus,
        paymentMethod,
        paymentTransactionId,
        feeAmount: originalFeeLedger.feeAmount
      },
      restaurantId: originalFeeLedger.restaurantId
    });
    
    // Publish payment status updated event
    await publishPaymentStatusUpdated(updatedFeeLedger);
    
    // Publish due fees updated event
    await publishDueFeesUpdated(originalFeeLedger.restaurantId);
    
    return updatedFeeLedger;
  },
  payPlatformFees: async (_: any, { restaurantId, paymentMethod, paymentTransactionId }: any, context: GraphQLContext) => {
    if (!context.restaurant || context.restaurant.id !== restaurantId) {
      throw new Error('Restaurant authentication required');
    }
    
    // Get all pending fees for this restaurant
    const pendingFees = await FeeLedger.find({ 
      restaurantId, 
      paymentStatus: 'pending' 
    });
    
    if (pendingFees.length === 0) {
      return {
        success: true,
        message: 'No pending fees to pay',
        paidFeesCount: 0,
        totalAmountPaid: 0,
        transactionId: paymentTransactionId
      };
    }
    
    const totalAmount = pendingFees.reduce((sum, fee) => sum + fee.feeAmount, 0);
    
    // Update all pending fees to paid
    await FeeLedger.updateMany(
      { restaurantId, paymentStatus: 'pending' },
      { 
        paymentStatus: 'paid',
        paymentMethod,
        paymentTransactionId,
        paidAt: new Date()
      }
    );
    
    // Publish events for each updated fee
    for (const fee of pendingFees) {
      const updatedFee = await FeeLedger.findById(fee._id);
      await publishPaymentStatusUpdated(updatedFee);
    }
    
    // Publish due fees updated event
    await publishDueFeesUpdated(restaurantId);
    
    return {
      success: true,
      message: `Successfully paid ${pendingFees.length} platform fees`,
      paidFeesCount: pendingFees.length,
      totalAmountPaid: totalAmount,
      transactionId: paymentTransactionId
    };
  },
};
