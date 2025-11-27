import mongoose from 'mongoose';
import { MenuItem, Table, Order, Reservation, User, RestaurantFeeConfig, FeeLedger, Settlement, PurchaseCategory, Vendor, PurchaseItem, Purchase } from '../models/index.js';
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

    // Create order with proper restaurantId from context (ignore input.restaurantId for security)
    // This ensures orders are always created for the authenticated restaurant, not what the frontend sends
    const orderData = {
      restaurantId: restaurantId, // Always use authenticated restaurantId, never from input
      orderType: input.orderType,
      tableNumber: input.tableNumber || null,
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
    const updateData = {
      ...input,
      restaurantId: currentOrder.restaurantId, // Preserve original restaurantId
      updatedAt: new Date()
    };
    
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: id, restaurantId: restaurantObjectId }, 
      updateData, 
      { new: true }
    );
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
  updateOrderItemStatus: async (_: any, { orderId, itemIndex, status }: { orderId: string; itemIndex: number; status: string }, context: GraphQLContext) => {
    if (!context.restaurant) {
      throw new Error('Authentication required');
    }
    // Convert restaurantId string to ObjectId for proper MongoDB comparison
    const restaurantObjectId = new mongoose.Types.ObjectId(context.restaurant.id);
    const order = await Order.findOne({ _id: orderId, restaurantId: restaurantObjectId });
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
    
    // Create purchase
    const purchase = new Purchase({
      restaurantId: context.restaurant.id,
      vendorId: input.vendorId,
      purchaseDate: new Date(input.purchaseDate),
      totalAmount: input.totalAmount,
      currency,
      paymentStatus: input.paymentStatus || 'unpaid',
      paymentMethod: input.paymentMethod,
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
    if (input.purchaseDate) purchase.purchaseDate = new Date(input.purchaseDate);
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
