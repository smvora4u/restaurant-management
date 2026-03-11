import mongoose from 'mongoose';
import { MenuItem, MenuCategory, Table, Order, Reservation, WaitlistEntry, User, RestaurantFeeConfig, FeeLedger, Settlement, PurchaseCategory, Vendor, PurchaseItem, Purchase } from '../models/index.js';
import { GraphQLContext } from '../types/index.js';
import { publishOrderUpdated, publishNewOrder, publishFeeLedgerUpdated, publishPaymentStatusUpdated, publishDueFeesUpdated, publishMenuItemsUpdated, publishWaitlistUpdated } from './subscriptions.js';
import { parseDateInput } from '../utils/dateUtils.js';
import { normalizePhone } from '../utils/phoneUtils.js';

export const mutationResolvers = {
  // Menu Item mutations
  createMenuItem: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    if (input.categoryId) {
      const cat = await MenuCategory.findOne({ _id: input.categoryId, restaurantId });
      if (!cat) throw new Error('Category not found');
      input.category = cat.name; // keep category string for legacy compatibility
    } else if (!input.category && !input.categoryId) {
      throw new Error('Either category or categoryId is required');
    }
    const menuItem = new MenuItem({ ...input, restaurantId });
    const saved = await menuItem.save();
    if (restaurantId) await publishMenuItemsUpdated(restaurantId);
    return saved;
  },
  updateMenuItem: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    if (input.categoryId) {
      const cat = await MenuCategory.findOne({ _id: input.categoryId, restaurantId });
      if (!cat) throw new Error('Category not found');
      input.category = cat.name;
    }
    const updated = await MenuItem.findOneAndUpdate(
      { _id: id, restaurantId },
      { ...input, restaurantId, updatedAt: new Date() },
      { new: true }
    );
    if (restaurantId) await publishMenuItemsUpdated(restaurantId);
    return updated;
  },
  deleteMenuItem: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    const result = await MenuItem.findOneAndDelete({ _id: id, restaurantId });
    if (result && restaurantId) await publishMenuItemsUpdated(restaurantId);
    return !!result;
  },
  createMenuCategory: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    if (input.restaurantId && input.restaurantId !== restaurantId) {
      throw new Error('Unauthorized');
    }
    const category = new MenuCategory({ ...input, restaurantId });
    const saved = await category.save();
    if (restaurantId) await publishMenuItemsUpdated(restaurantId);
    return saved;
  },
  updateMenuCategory: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    const updated = await MenuCategory.findOneAndUpdate(
      { _id: id, restaurantId },
      { ...input, updatedAt: new Date() },
      { new: true }
    );
    if (restaurantId) await publishMenuItemsUpdated(restaurantId);
    return updated;
  },
  deleteMenuCategory: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    const itemsUsingCategory = await MenuItem.countDocuments({ categoryId: id });
    if (itemsUsingCategory > 0) {
      throw new Error(`Cannot delete: ${itemsUsingCategory} menu item(s) use this category`);
    }
    const subcategories = await MenuCategory.countDocuments({ parentCategoryId: id });
    if (subcategories > 0) {
      throw new Error('Cannot delete: remove or reassign subcategories first');
    }
    const result = await MenuCategory.findOneAndDelete({ _id: id, restaurantId });
    if (result && restaurantId) await publishMenuItemsUpdated(restaurantId);
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
    
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }
    
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

      // Check if table already has an active order (primary or linked)
      const activeOrders = await Order.find({
        restaurantId: restaurantId,
        orderType: 'dine-in',
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] }
      });
      const isOccupied = activeOrders.some(
        (o) => o.tableNumber === input.tableNumber || (o.linkedTableNumbers || []).includes(input.tableNumber)
      );
      if (isOccupied) {
        throw new Error(`Table ${input.tableNumber} already has an active order`);
      }
    }

    // Validate linked tables if provided (dine-in only)
    const linkedTables = (input.orderType === 'dine-in' && input.linkedTableNumbers) ? input.linkedTableNumbers : [];
    for (const tn of linkedTables) {
      const tbl = await Table.findOne({ number: tn, restaurantId });
      if (!tbl) throw new Error(`Table ${tn} does not exist`);
      const linkedActiveOrders = await Order.find({
        restaurantId,
        orderType: 'dine-in',
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] }
      });
      const isOccupied = linkedActiveOrders.some(
        (o) => o.tableNumber === tn || (o.linkedTableNumbers || []).includes(tn)
      );
      if (isOccupied) throw new Error(`Table ${tn} already has an active order`);
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

    // Create order with proper restaurantId from context (ignore input.restaurantId for security)
    // This ensures orders are always created for the authenticated restaurant, not what the frontend sends
    const orderData = {
      restaurantId: restaurantId, // Always use authenticated restaurantId, never from input
      orderType: input.orderType,
      tableNumber: input.tableNumber || null,
      linkedTableNumbers: linkedTables.length > 0 ? linkedTables : undefined,
      items: input.items || [],
      totalAmount: input.totalAmount || 0,
      status: input.status || 'pending',
      customerName: input.customerName || null,
      customerPhone: input.customerPhone || null,
      notes: input.notes || null,
      sessionId: input.sessionId || null,
      userId: input.userId || null
    };
    
    console.log(`Creating order for restaurantId: ${restaurantId} (from context), ignoring input.restaurantId: ${input.restaurantId}`);

    const order = new Order(orderData);
    
    try {
      const savedOrder = await order.save();
      console.log(`Order created successfully - ID: ${savedOrder._id}, RestaurantId: ${savedOrder.restaurantId}`);
      await publishNewOrder(savedOrder);
      return savedOrder;
    } catch (error: any) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error.message || 'Unknown error'}`);
    }
  },
  updateOrder: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }
    
    // Get the current order to check its status
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    const currentOrder = await Order.findOne({ _id: id, restaurantId: restaurantObjectId });
    if (!currentOrder) {
      throw new Error('Order not found');
    }
    
    // Prevent updating cancelled or completed orders (terminal states)
    if (currentOrder.status === 'cancelled' || currentOrder.status === 'completed') {
      throw new Error(`Cannot update order that is ${currentOrder.status}. This is a terminal state.`);
    }
    
    // If trying to change status, validate the transition
    if (input.status && input.status !== currentOrder.status) {
      // Prevent changing to cancelled/completed if order is already in a terminal state
      if (input.status === 'cancelled' && !['pending', 'confirmed'].includes(currentOrder.status)) {
        throw new Error('Can only cancel orders that are pending or confirmed');
      }
    }
    
    // Never update restaurantId - always preserve the original from the order
    // Exclude version from updateData - we use $inc for optimistic locking
    const { version: _inputVersion, ...inputWithoutVersion } = input;
    const updateData: Record<string, unknown> = {
      ...inputWithoutVersion,
      restaurantId: currentOrder.restaurantId, // Preserve original restaurantId
      updatedAt: new Date()
    };
    // When detaching table (tableNumber explicitly null), also clear linkedTableNumbers
    if (input.tableNumber === null) {
      updateData.linkedTableNumbers = [];
    }

    // Optimistic locking: when version is provided, require it to match
    const filter: Record<string, unknown> = { _id: id, restaurantId: restaurantObjectId };
    if (input.version != null) {
      filter.version = input.version;
    }
    const update = { $set: updateData, $inc: { version: 1 } };
    const updatedOrder = await Order.findOneAndUpdate(filter, update, { new: true });

    if (!updatedOrder) {
      if (input.version != null) {
        throw new Error('Order was modified by another user. Please refresh and try again.');
      }
      throw new Error('Order not found');
    }
    if (updatedOrder) {
      await publishOrderUpdated(updatedOrder);
    }
    return updatedOrder;
  },
  markOrderPaid: async (_: any, { id, paymentMethod, paymentTransactionId }: { id: string; paymentMethod: string; paymentTransactionId?: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    const order = await Order.findOne({ _id: id, restaurantId: restaurantObjectId });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'completed') {
      throw new Error('Only completed orders can be marked paid');
    }
    if ((order as any).paid) return order; // idempotent

    (order as any).paid = true;
    (order as any).paidAt = new Date();
    (order as any).paymentMethod = paymentMethod;
    if (paymentTransactionId) (order as any).paymentTransactionId = paymentTransactionId;
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
      // Skip if a ledger already exists for this order (idempotency)
      const existingLedger = await FeeLedger.findOne({ restaurantId, orderId: id });
      if (!existingLedger) {
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
        await publishDueFeesUpdated(restaurantId!);
      }
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
  deleteOrder: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(context.restaurant.id);
    const result = await Order.findOneAndDelete({ _id: id, restaurantId: restaurantObjectId });
    return !!result;
  },
  
  // Reservation mutations
  createReservation: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const reservation = new Reservation({
      ...input,
      restaurantId: context.restaurant.id,
      date: parseDateInput(input.date)
    });
    return await reservation.save();
  },
  updateReservation: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    const updateData: any = { ...input };
    if (input.date) {
      updateData.date = parseDateInput(input.date);
    }
    return await Reservation.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id },
      updateData,
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
  addToWaitlist: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    if (!restaurantId) throw new Error('Authentication required');
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    const normalizedPhone = normalizePhone(input.customerPhone || '');
    if (!normalizedPhone) {
      throw new Error('Valid phone number is required');
    }
    const existingActive = await WaitlistEntry.findOne({
      restaurantId: restaurantObjectId,
      status: { $in: ['waiting', 'notified'] },
      normalizedPhone
    });
    if (existingActive) {
      throw new Error(`You're already on the waitlist. Position #${existingActive.queuePosition}`);
    }
    const maxPos = await WaitlistEntry.findOne({ restaurantId: restaurantObjectId })
      .sort({ queuePosition: -1 })
      .select('queuePosition')
      .lean();
    const queuePosition = (maxPos?.queuePosition ?? 0) + 1;
    const entry = new WaitlistEntry({
      restaurantId: restaurantObjectId,
      customerName: input.customerName?.trim() || '',
      customerPhone: input.customerPhone?.trim() || '',
      normalizedPhone,
      partySize: Math.max(1, parseInt(String(input.partySize), 10) || 1),
      notes: input.notes?.trim() || null,
      status: 'waiting',
      queuePosition
    });
    const saved = await entry.save();
    await publishWaitlistUpdated(restaurantId);
    return saved;
  },
  removeFromWaitlist: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    if (!restaurantId) throw new Error('Authentication required');
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    const entry = await WaitlistEntry.findOne({ _id: id, restaurantId: restaurantObjectId });
    if (!entry) {
      throw new Error('Waitlist entry not found');
    }
    entry.status = 'cancelled';
    await entry.save();
    await publishWaitlistUpdated(restaurantId);
    return true;
  },
  notifyWaitlistEntry: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    if (!restaurantId) throw new Error('Authentication required');
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    const entry = await WaitlistEntry.findOne({ _id: id, restaurantId: restaurantObjectId });
    if (!entry) {
      throw new Error('Waitlist entry not found');
    }
    if (entry.status !== 'waiting' && entry.status !== 'notified') {
      throw new Error(`Cannot notify: entry status is ${entry.status}`);
    }
    entry.status = 'notified';
    entry.notifiedAt = new Date();
    await entry.save();
    await publishWaitlistUpdated(restaurantId);
    return entry;
  },
  seatWaitlistEntry: async (_: any, { id, tableNumbers }: { id: string; tableNumbers: string[] }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    if (!restaurantId) throw new Error('Authentication required');
    if (!tableNumbers || tableNumbers.length === 0) {
      throw new Error('At least one table must be selected');
    }
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    const entry = await WaitlistEntry.findOne({ _id: id, restaurantId: restaurantObjectId });
    if (!entry) {
      throw new Error('Waitlist entry not found');
    }
    if (entry.status !== 'waiting' && entry.status !== 'notified') {
      throw new Error(`Cannot seat: entry status is ${entry.status}`);
    }
    const TableModel = (await import('../models/Table.js')).default;
    for (const tn of tableNumbers) {
      const tbl = await TableModel.findOne({ restaurantId: restaurantObjectId, number: tn });
      if (!tbl) throw new Error(`Table ${tn} does not exist`);
      const activeOrders = await Order.find({
        restaurantId: restaurantObjectId,
        orderType: 'dine-in',
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] }
      });
      const isOccupied = activeOrders.some(
        (o) => o.tableNumber === tn || (o.linkedTableNumbers || []).includes(tn)
      );
      if (isOccupied) throw new Error(`Table ${tn} is already occupied`);
    }
    // No capacity validation - staff/restaurant manages seating (add chairs, merge physically, etc.)
    entry.status = 'seated';
    entry.seatedAt = new Date();
    entry.assignedTableNumber = tableNumbers.join('+');
    await entry.save();
    await publishWaitlistUpdated(restaurantId);
    return entry;
  },
  linkTableToOrder: async (_: any, { orderId, tableNumber }: { orderId: string; tableNumber: string }, context: GraphQLContext) => {
    if (!context.restaurant && !context.staff) {
      throw new Error('Authentication required');
    }
    const restaurantId = context.restaurant?.id || context.staff?.restaurantId;
    if (!restaurantId) throw new Error('Authentication required');
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    const order = await Order.findOne({ _id: orderId, restaurantId: restaurantObjectId });
    if (!order) throw new Error('Order not found');
    if (order.orderType !== 'dine-in') throw new Error('Can only link tables to dine-in orders');
    if (!['pending', 'confirmed', 'preparing', 'ready', 'served'].includes(order.status)) {
      throw new Error('Can only link tables to active orders');
    }
    const tbl = await Table.findOne({ restaurantId: restaurantObjectId, number: tableNumber });
    if (!tbl) throw new Error(`Table ${tableNumber} does not exist`);
    const linked = order.linkedTableNumbers || [];
    if (order.tableNumber === tableNumber || linked.includes(tableNumber)) {
      throw new Error(`Table ${tableNumber} is already linked to this order`);
    }
    const activeOrders = await Order.find({
      restaurantId: restaurantObjectId,
      orderType: 'dine-in',
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] }
    });
    const isOccupied = activeOrders.some(
      (o) => o.tableNumber === tableNumber || (o.linkedTableNumbers || []).includes(tableNumber)
    );
    if (isOccupied) throw new Error(`Table ${tableNumber} is already occupied`);
    order.linkedTableNumbers = [...linked, tableNumber];
    await order.save();
    await publishOrderUpdated(order);
    return order;
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

    // Validate/normalize payment method
    const allowedMethods = ['card', 'bank_transfer', 'cash', 'other'];
    if (paymentMethod && !allowedMethods.includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    // Require reason for any admin status change
    if (!reason || !String(reason).trim()) {
      throw new Error('Reason is required for payment status changes');
    }
    
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }
    
    if (paymentTransactionId) {
      updateData.paymentTransactionId = paymentTransactionId;
    }
    
    // If marking as paid, set paidAt to current time
    if (paymentStatus === 'paid') {
      // Ensure method is present when marking paid; auto-generate transaction for cash if missing
      if (!updateData.paymentMethod && !paymentMethod) {
        throw new Error('Payment method is required when marking as paid');
      }
      if ((paymentMethod === 'card' || paymentMethod === 'bank_transfer') && !paymentTransactionId) {
        throw new Error('Transaction ID is required for online payments');
      }
      if (paymentMethod === 'cash' && !paymentTransactionId) {
        updateData.paymentTransactionId = `CASH_${context.admin.id}_${Date.now()}`;
      }
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
    
    // Enforce online methods only for restaurants
    const allowedOnlineMethods = ['card', 'bank_transfer'];
    if (!allowedOnlineMethods.includes(paymentMethod)) {
      throw new Error('Invalid payment method. Restaurants may only pay fees via online methods (card or bank_transfer).');
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
    
    // Audit log restaurant-triggered payment
    const { AuditLog } = await import('../models/index.js');
    await AuditLog.create({
      actorRole: 'restaurant',
      actorId: context.restaurant.id,
      action: 'PAY_PLATFORM_FEES',
      entityType: 'FeeLedger',
      entityId: 'multiple',
      reason: `Restaurant paid platform fees via ${paymentMethod}`,
      details: {
        restaurantId,
        method: paymentMethod,
        transactionId: paymentTransactionId,
        paidFeesCount: pendingFees.length,
        totalAmountPaid: totalAmount
      },
      restaurantId
    });

    return {
      success: true,
      message: `Successfully paid ${pendingFees.length} platform fees`,
      paidFeesCount: pendingFees.length,
      totalAmountPaid: totalAmount,
      transactionId: paymentTransactionId
    };
  },
  
  // Purchase Management mutations
  createPurchaseCategory: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    if (input.restaurantId !== context.restaurant.id) {
      throw new Error('Unauthorized');
    }
    const category = new PurchaseCategory({ ...input, restaurantId: context.restaurant.id });
    return await category.save();
  },
  updatePurchaseCategory: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await PurchaseCategory.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id },
      { ...input, updatedAt: new Date() },
      { new: true }
    );
  },
  deletePurchaseCategory: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    // Check if category is used in any purchase items
    const itemsUsingCategory = await PurchaseItem.countDocuments({ categoryId: id });
    if (itemsUsingCategory > 0) {
      throw new Error('Cannot delete category: It is being used in purchase items');
    }
    const result = await PurchaseCategory.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
  createVendor: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    if (input.restaurantId !== context.restaurant.id) {
      throw new Error('Unauthorized');
    }
    const vendor = new Vendor({ ...input, restaurantId: context.restaurant.id });
    return await vendor.save();
  },
  updateVendor: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    return await Vendor.findOneAndUpdate(
      { _id: id, restaurantId: context.restaurant.id },
      { ...input, updatedAt: new Date() },
      { new: true }
    );
  },
  deleteVendor: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    // Check if vendor is used in any purchases
    const purchasesUsingVendor = await Purchase.countDocuments({ vendorId: id });
    if (purchasesUsingVendor > 0) {
      throw new Error('Cannot delete vendor: It is being used in purchases');
    }
    const result = await Vendor.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
  createPurchase: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    if (input.restaurantId !== context.restaurant.id) {
      throw new Error('Unauthorized');
    }
    
    // Validate vendor exists
    const vendor = await Vendor.findOne({ _id: input.vendorId, restaurantId: context.restaurant.id });
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    
    // Get restaurant currency
    const Restaurant = (await import('../models/Restaurant.js')).default;
    const restaurant = await Restaurant.findById(context.restaurant.id);
    const currency = input.currency || restaurant?.settings?.currency || 'USD';
    
    // Validate payment method is provided when payment status is 'paid'
    const paymentStatus = input.paymentStatus || 'unpaid';
    if (paymentStatus === 'paid' && !input.paymentMethod) {
      throw new Error('Payment method is required when payment status is "paid"');
    }
    
    // Create purchase
    const purchase = new Purchase({
      restaurantId: context.restaurant.id,
      vendorId: input.vendorId,
      purchaseDate: parseDateInput(input.purchaseDate),
      totalAmount: input.totalAmount,
      currency,
      paymentStatus,
      paymentMethod: input.paymentMethod || undefined, // Only set if provided
      invoiceNumber: input.invoiceNumber,
      notes: input.notes,
      createdBy: context.restaurant.email || 'Restaurant',
      createdById: context.restaurant.id
    });
    const savedPurchase = await purchase.save();
    
    // Create purchase items
    const items = [];
    for (const itemInput of input.items) {
      const totalPrice = itemInput.quantity * itemInput.unitPrice;
      const item = new PurchaseItem({
        purchaseId: savedPurchase._id,
        itemName: itemInput.itemName,
        quantity: itemInput.quantity,
        unit: itemInput.unit,
        unitPrice: itemInput.unitPrice,
        totalPrice,
        categoryId: itemInput.categoryId || null,
        notes: itemInput.notes
      });
      const savedItem = await item.save();
      items.push(savedItem);
    }
    
    // Populate items for return
    (savedPurchase as any).items = items;
    (savedPurchase as any).vendor = vendor;
    
    return savedPurchase;
  },
  updatePurchase: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    
    const purchase = await Purchase.findOne({ _id: id, restaurantId: context.restaurant.id });
    if (!purchase) {
      throw new Error('Purchase not found');
    }
    
    // Update purchase fields
    if (input.vendorId) {
      const vendor = await Vendor.findOne({ _id: input.vendorId, restaurantId: context.restaurant.id });
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      purchase.vendorId = input.vendorId;
    }
    if (input.purchaseDate) purchase.purchaseDate = parseDateInput(input.purchaseDate);
    if (input.totalAmount !== undefined) purchase.totalAmount = input.totalAmount;
    if (input.currency) purchase.currency = input.currency;
    if (input.paymentStatus) purchase.paymentStatus = input.paymentStatus;
    if (input.paymentMethod !== undefined) purchase.paymentMethod = input.paymentMethod;
    if (input.invoiceNumber !== undefined) purchase.invoiceNumber = input.invoiceNumber;
    if (input.notes !== undefined) purchase.notes = input.notes;
    
    await purchase.save();
    
    // Update items if provided
    if (input.items) {
      // Delete existing items
      await PurchaseItem.deleteMany({ purchaseId: purchase._id });
      
      // Create new items
      const items = [];
      for (const itemInput of input.items) {
        const totalPrice = itemInput.quantity * itemInput.unitPrice;
        const item = new PurchaseItem({
          purchaseId: purchase._id,
          itemName: itemInput.itemName,
          quantity: itemInput.quantity,
          unit: itemInput.unit,
          unitPrice: itemInput.unitPrice,
          totalPrice,
          categoryId: itemInput.categoryId || null,
          notes: itemInput.notes
        });
        const savedItem = await item.save();
        items.push(savedItem);
      }
      (purchase as any).items = items;
    } else {
      // Populate existing items
      const items = await PurchaseItem.find({ purchaseId: purchase._id }).populate('categoryId');
      (purchase as any).items = items;
    }
    
    // Populate vendor
    await purchase.populate('vendorId');
    (purchase as any).vendor = purchase.vendorId;
    
    return purchase;
  },
  settlePurchases: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    if (input.restaurantId !== context.restaurant.id) {
      throw new Error('Unauthorized');
    }
    if (!input.paymentMethod) {
      throw new Error('Payment method is required to settle purchases');
    }

    const restaurantObjectId = new mongoose.Types.ObjectId(input.restaurantId);
    const query: any = {
      restaurantId: restaurantObjectId,
      paymentStatus: 'unpaid'
    };

    if (Array.isArray(input.purchaseIds) && input.purchaseIds.length > 0) {
      query._id = { $in: input.purchaseIds.map((id: string) => new mongoose.Types.ObjectId(id)) };
    } else {
      if (input.vendorId) query.vendorId = new mongoose.Types.ObjectId(input.vendorId);
      if (input.startDate || input.endDate) {
        query.purchaseDate = {};
        if (input.startDate) query.purchaseDate.$gte = parseDateInput(input.startDate);
        if (input.endDate) query.purchaseDate.$lte = parseDateInput(input.endDate);
      }

      if (input.categoryId) {
        const restaurantPurchaseIds = await Purchase.find({ restaurantId: restaurantObjectId }).select('_id').lean();
        const restaurantPurchaseIdArray = restaurantPurchaseIds.map(p => p._id);

        if (restaurantPurchaseIdArray.length === 0) {
          return { matchedCount: 0, modifiedCount: 0 };
        }

        const purchaseIds = await PurchaseItem.distinct('purchaseId', {
          categoryId: new mongoose.Types.ObjectId(input.categoryId),
          purchaseId: { $in: restaurantPurchaseIdArray }
        });

        if (purchaseIds.length === 0) {
          return { matchedCount: 0, modifiedCount: 0 };
        }

        query._id = { $in: purchaseIds };
      }
    }

    const updateData: any = {
      paymentStatus: 'paid',
      paymentMethod: input.paymentMethod,
      paidAt: input.paidAt ? parseDateInput(input.paidAt) : new Date()
    };

    if (input.paymentTransactionId !== undefined) {
      updateData.paymentTransactionId = input.paymentTransactionId;
    }

    const result = await Purchase.updateMany(query, { $set: updateData });
    return {
      matchedCount: result.matchedCount ?? 0,
      modifiedCount: result.modifiedCount ?? 0
    };
  },
  deletePurchase: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    
    // Delete purchase items first
    await PurchaseItem.deleteMany({ purchaseId: id });
    
    // Delete purchase
    const result = await Purchase.findOneAndDelete({ _id: id, restaurantId: context.restaurant.id });
    return !!result;
  },
};
