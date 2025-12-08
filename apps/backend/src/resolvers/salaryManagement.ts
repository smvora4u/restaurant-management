import mongoose from 'mongoose';
import { SalaryConfig, SalaryPayment, AdvancePayment, Staff, Restaurant, AuditLog } from '../models/index.js';
import { GraphQLContext } from '../types/index.js';
import { publishAuditLogCreated } from './subscriptions.js';
import { parseLocalDateString, formatDateAsString } from '../utils/dateUtils.js';

// Helper function to check if user can access staff data
const canAccessStaff = async (staffId: string, context: GraphQLContext): Promise<{ staff: any; canAccess: boolean }> => {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    throw new Error('Staff not found');
  }

  // Admin can access any staff
  if (context.admin) {
    return { staff, canAccess: true };
  }

  // Restaurant can access their own staff
  if (context.restaurant) {
    const restaurantId = context.restaurant.id;
    if (staff.restaurantId.toString() === restaurantId) {
      return { staff, canAccess: true };
    }
    throw new Error('Access denied: Cannot access staff from different restaurant');
  }

  // Staff can only access their own data
  if (context.staff) {
    if (context.staff.id === staffId) {
      return { staff, canAccess: true };
    }
    throw new Error('Access denied: Can only view own salary information');
  }

  throw new Error('Authentication required');
};

// Helper function to check if user can manage staff salaries
const canManageStaff = async (staffId: string, context: GraphQLContext): Promise<{ staff: any }> => {
  if (!context.admin && !context.restaurant) {
    throw new Error('Access denied: Only admins and restaurants can manage staff salaries');
  }

  const staff = await Staff.findById(staffId);
  if (!staff) {
    throw new Error('Staff not found');
  }

  // Admin can manage any staff
  if (context.admin) {
    return { staff };
  }

  // Restaurant can only manage their own staff
  if (context.restaurant) {
    const restaurantId = context.restaurant.id;
    if (staff.restaurantId.toString() === restaurantId) {
      return { staff };
    }
    throw new Error('Access denied: Cannot manage staff from different restaurant');
  }

  throw new Error('Authentication required');
};

// Helper function to create audit log
const createAuditLog = async (
  actorRole: 'admin' | 'restaurant',
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  restaurantId: string,
  reason?: string,
  details?: any
) => {
  try {
    const auditLog = new AuditLog({
      actorRole,
      actorId,
      action,
      entityType,
      entityId,
      restaurantId,
      reason,
      details
    });
    await auditLog.save();
    await publishAuditLogCreated({
      id: auditLog._id.toString(),
      actorRole,
      actorId,
      action,
      entityType,
      entityId,
      restaurantId,
      reason,
      details,
      createdAt: auditLog.createdAt
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

export const salaryManagementResolvers = {
  Staff: {
    salaryConfig: async (parent: any) => {
      const config = await SalaryConfig.findOne({ 
        staffId: new mongoose.Types.ObjectId(parent.id),
        isActive: true 
      });

      if (!config) {
        return null;
      }

      return {
        id: config._id.toString(),
        staffId: config.staffId.toString(),
        restaurantId: config.restaurantId.toString(),
        salaryType: config.salaryType,
        baseSalary: config.baseSalary,
        hourlyRate: config.hourlyRate,
        currency: config.currency,
        paymentFrequency: config.paymentFrequency,
        effectiveDate: config.effectiveDate.toISOString(),
        notes: config.notes,
        isActive: config.isActive,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString()
      };
    }
  },

  Query: {
    staffSalaryConfig: async (_: any, { staffId }: { staffId: string }, context: GraphQLContext) => {
      const { staff, canAccess } = await canAccessStaff(staffId, context);
      
      const config = await SalaryConfig.findOne({ 
        staffId: new mongoose.Types.ObjectId(staffId),
        isActive: true 
      });

      if (!config) {
        return null;
      }

      return {
        id: config._id.toString(),
        staffId: config.staffId.toString(),
        restaurantId: config.restaurantId.toString(),
        salaryType: config.salaryType,
        baseSalary: config.baseSalary,
        hourlyRate: config.hourlyRate,
        currency: config.currency,
        paymentFrequency: config.paymentFrequency,
        effectiveDate: config.effectiveDate.toISOString(),
        notes: config.notes,
        isActive: config.isActive,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString()
      };
    },

    staffSalaryPayments: async (
      _: any,
      { staffId, limit = 50, offset = 0 }: { staffId: string; limit?: number; offset?: number },
      context: GraphQLContext
    ) => {
      await canAccessStaff(staffId, context);

      const query = SalaryPayment.find({ 
        staffId: new mongoose.Types.ObjectId(staffId) 
      }).sort({ createdAt: -1 });

      const totalCount = await SalaryPayment.countDocuments({ 
        staffId: new mongoose.Types.ObjectId(staffId) 
      });

      const payments = await query.skip(offset).limit(limit);

      return {
        data: payments.map(payment => ({
          id: payment._id.toString(),
          staffId: payment.staffId.toString(),
          restaurantId: payment.restaurantId.toString(),
          paymentPeriodStart: payment.paymentPeriodStart.toISOString(),
          paymentPeriodEnd: payment.paymentPeriodEnd.toISOString(),
          baseAmount: payment.baseAmount,
          hoursWorked: payment.hoursWorked,
          hourlyRate: payment.hourlyRate,
          advanceDeduction: payment.advanceDeduction ?? 0,
          bonusAmount: payment.bonusAmount,
          deductionAmount: payment.deductionAmount,
          totalAmount: payment.totalAmount,
          paymentStatus: payment.paymentStatus,
          paymentMethod: payment.paymentMethod,
          paymentTransactionId: payment.paymentTransactionId,
          paidAt: payment.paidAt?.toISOString(),
          notes: payment.notes,
          createdBy: payment.createdBy,
          createdById: payment.createdById,
          createdAt: payment.createdAt.toISOString(),
          updatedAt: payment.updatedAt.toISOString()
        })),
        totalCount
      };
    },

    staffSalarySummary: async (_: any, { staffId }: { staffId: string }, context: GraphQLContext) => {
      const { staff } = await canAccessStaff(staffId, context);

      const payments = await SalaryPayment.find({ 
        staffId: new mongoose.Types.ObjectId(staffId) 
      });

      // Calculate actual amount paid to staff (excluding advance deductions)
      // Advance deductions are settlements, not actual payment reductions
      const calculateActualPaid = (p: any) => {
        const base = p.baseAmount || 0;
        const hourly = (p.hoursWorked && p.hourlyRate) ? p.hoursWorked * p.hourlyRate : 0;
        const bonus = p.bonusAmount || 0;
        const deduction = p.deductionAmount || 0;
        return base + hourly + bonus - deduction;
      };

      const totalPaid = payments
        .filter(p => p.paymentStatus === 'paid')
        .reduce((sum, p) => sum + calculateActualPaid(p), 0);
      
      const totalPending = payments
        .filter(p => p.paymentStatus === 'pending')
        .reduce((sum, p) => sum + calculateActualPaid(p), 0);
      
      const totalFailed = payments
        .filter(p => p.paymentStatus === 'failed')
        .reduce((sum, p) => sum + calculateActualPaid(p), 0);

      const paidPayments = payments.filter(p => p.paymentStatus === 'paid');
      const sortedPaidPayments = paidPayments.sort((a, b) => (b.paidAt?.getTime() || 0) - (a.paidAt?.getTime() || 0));
      const lastPaymentDate = sortedPaidPayments.length > 0 && sortedPaidPayments[0]?.paidAt
        ? sortedPaidPayments[0].paidAt.toISOString()
        : null;

      // Get currency from active salary config or default
      const config = await SalaryConfig.findOne({ 
        staffId: new mongoose.Types.ObjectId(staffId),
        isActive: true 
      });
      const currency = config?.currency || 'USD';

      return {
        staffId: staff._id.toString(),
        staffName: staff.name,
        totalPaid,
        totalPending,
        totalFailed,
        paymentCount: payments.length,
        lastPaymentDate,
        currency
      };
    },

    allStaffSalaryPayments: async (
      _: any,
      { restaurantId, limit = 50, offset = 0, paymentStatus }: { restaurantId: string; limit?: number; offset?: number; paymentStatus?: string },
      context: GraphQLContext
    ) => {
      if (!context.admin && !context.restaurant) {
        throw new Error('Access denied: Only admins and restaurants can view all staff salary payments');
      }

      // Restaurant can only view their own staff payments
      if (context.restaurant && context.restaurant.id !== restaurantId) {
        throw new Error('Access denied: Cannot view payments from different restaurant');
      }

      const query: any = { 
        restaurantId: new mongoose.Types.ObjectId(restaurantId) 
      };

      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }

      const totalCount = await SalaryPayment.countDocuments(query);
      const payments = await SalaryPayment.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);

      return {
        data: payments.map(payment => ({
          id: payment._id.toString(),
          staffId: payment.staffId.toString(),
          restaurantId: payment.restaurantId.toString(),
          paymentPeriodStart: payment.paymentPeriodStart.toISOString(),
          paymentPeriodEnd: payment.paymentPeriodEnd.toISOString(),
          baseAmount: payment.baseAmount,
          hoursWorked: payment.hoursWorked,
          hourlyRate: payment.hourlyRate,
          advanceDeduction: payment.advanceDeduction ?? 0,
          bonusAmount: payment.bonusAmount,
          deductionAmount: payment.deductionAmount,
          totalAmount: payment.totalAmount,
          paymentStatus: payment.paymentStatus,
          paymentMethod: payment.paymentMethod,
          paymentTransactionId: payment.paymentTransactionId,
          paidAt: payment.paidAt?.toISOString(),
          notes: payment.notes,
          createdBy: payment.createdBy,
          createdById: payment.createdById,
          createdAt: payment.createdAt.toISOString(),
          updatedAt: payment.updatedAt.toISOString()
        })),
        totalCount
      };
    },

    staffAdvancePayments: async (
      _: any,
      { staffId, limit = 50, offset = 0, isSettled }: { staffId: string; limit?: number; offset?: number; isSettled?: boolean },
      context: GraphQLContext
    ) => {
      await canAccessStaff(staffId, context);

      const query: any = { 
        staffId: new mongoose.Types.ObjectId(staffId),
        paymentStatus: 'paid' // Only show paid advances
      };

      if (isSettled !== undefined) {
        query.isSettled = isSettled;
      }

      const totalCount = await AdvancePayment.countDocuments(query);
      const advances = await AdvancePayment.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);

      return {
        data: advances.map(advance => ({
          id: advance._id.toString(),
          staffId: advance.staffId.toString(),
          restaurantId: advance.restaurantId.toString(),
          amount: advance.amount,
          advanceDate: formatDateAsString(advance.advanceDate || advance.paidAt || advance.createdAt),
          paymentStatus: advance.paymentStatus,
          paymentMethod: advance.paymentMethod,
          paymentTransactionId: advance.paymentTransactionId,
          paidAt: advance.paidAt?.toISOString(),
          notes: advance.notes,
          isSettled: advance.isSettled,
          settledAt: advance.settledAt?.toISOString(),
          settledByPaymentId: advance.settledByPaymentId?.toString(),
          createdBy: advance.createdBy,
          createdById: advance.createdById,
          createdAt: advance.createdAt.toISOString(),
          updatedAt: advance.updatedAt.toISOString()
        })),
        totalCount
      };
    },

    staffAdvanceSummary: async (_: any, { staffId }: { staffId: string }, context: GraphQLContext) => {
      const { staff } = await canAccessStaff(staffId, context);

      const advances = await AdvancePayment.find({ 
        staffId: new mongoose.Types.ObjectId(staffId),
        paymentStatus: 'paid'
      });

      const totalAdvance = advances.reduce((sum, a) => sum + a.amount, 0);
      const totalSettled = advances
        .filter(a => a.isSettled)
        .reduce((sum, a) => sum + a.amount, 0);
      const pendingSettlement = totalAdvance - totalSettled;
      const unsettledCount = advances.filter(a => !a.isSettled).length;

      // Get currency from active salary config or default
      const config = await SalaryConfig.findOne({ 
        staffId: new mongoose.Types.ObjectId(staffId),
        isActive: true 
      });
      const currency = config?.currency || 'USD';

      return {
        staffId: staff._id.toString(),
        totalAdvance,
        totalSettled,
        pendingSettlement,
        unsettledCount,
        currency
      };
    }
  },

  Mutation: {
    setStaffSalaryConfig: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const { staff } = await canManageStaff(input.staffId, context);

      // Validate restaurant exists
      const restaurant = await Restaurant.findById(input.restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Validate staff belongs to restaurant
      if (staff.restaurantId.toString() !== input.restaurantId) {
        throw new Error('Staff does not belong to the specified restaurant');
      }

      // Deactivate existing active config
      await SalaryConfig.updateMany(
        { staffId: new mongoose.Types.ObjectId(input.staffId), isActive: true },
        { isActive: false }
      );

      // Create new config
      const config = new SalaryConfig({
        staffId: new mongoose.Types.ObjectId(input.staffId),
        restaurantId: new mongoose.Types.ObjectId(input.restaurantId),
        salaryType: input.salaryType,
        baseSalary: input.baseSalary,
        hourlyRate: input.hourlyRate,
        currency: input.currency,
        paymentFrequency: input.paymentFrequency,
        effectiveDate: new Date(input.effectiveDate),
        notes: input.notes,
        isActive: true
      });

      await config.save();

      // Create audit log
      const actorRole = context.admin ? 'admin' : 'restaurant';
      const actorId = context.admin?.id || context.restaurant?.id || '';
      await createAuditLog(
        actorRole,
        actorId,
        'SET_STAFF_SALARY_CONFIG',
        'SalaryConfig',
        config._id.toString(),
        input.restaurantId,
        `Set salary configuration for staff ${staff.name}`,
        { salaryType: input.salaryType, effectiveDate: input.effectiveDate }
      );

      return {
        id: config._id.toString(),
        staffId: config.staffId.toString(),
        restaurantId: config.restaurantId.toString(),
        salaryType: config.salaryType,
        baseSalary: config.baseSalary,
        hourlyRate: config.hourlyRate,
        currency: config.currency,
        paymentFrequency: config.paymentFrequency,
        effectiveDate: config.effectiveDate.toISOString(),
        notes: config.notes,
        isActive: config.isActive,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString()
      };
    },

    updateStaffSalaryConfig: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
      if (!context.admin && !context.restaurant) {
        throw new Error('Access denied: Only admins and restaurants can update staff salary configurations');
      }

      const config = await SalaryConfig.findById(id);
      if (!config) {
        throw new Error('Salary configuration not found');
      }

      // Check access
      await canManageStaff(config.staffId.toString(), context);

      const updateData: any = { ...input };
      if (input.effectiveDate) {
        updateData.effectiveDate = new Date(input.effectiveDate);
      }

      const updatedConfig = await SalaryConfig.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!updatedConfig) {
        throw new Error('Failed to update salary configuration');
      }

      // Create audit log
      const actorRole = context.admin ? 'admin' : 'restaurant';
      const actorId = context.admin?.id || context.restaurant?.id || '';
      await createAuditLog(
        actorRole,
        actorId,
        'UPDATE_STAFF_SALARY_CONFIG',
        'SalaryConfig',
        id,
        updatedConfig.restaurantId.toString(),
        `Updated salary configuration`,
        { changes: input }
      );

      return {
        id: updatedConfig._id.toString(),
        staffId: updatedConfig.staffId.toString(),
        restaurantId: updatedConfig.restaurantId.toString(),
        salaryType: updatedConfig.salaryType,
        baseSalary: updatedConfig.baseSalary,
        hourlyRate: updatedConfig.hourlyRate,
        currency: updatedConfig.currency,
        paymentFrequency: updatedConfig.paymentFrequency,
        effectiveDate: updatedConfig.effectiveDate.toISOString(),
        notes: updatedConfig.notes,
        isActive: updatedConfig.isActive,
        createdAt: updatedConfig.createdAt.toISOString(),
        updatedAt: updatedConfig.updatedAt.toISOString()
      };
    },

    createSalaryPayment: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const { staff } = await canManageStaff(input.staffId, context);

      // Validate restaurant exists
      const restaurant = await Restaurant.findById(input.restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Validate staff belongs to restaurant
      if (staff.restaurantId.toString() !== input.restaurantId) {
        throw new Error('Staff does not belong to the specified restaurant');
      }

      // Calculate available salary (before advance deduction)
      const availableSalary = input.baseAmount + 
        (input.hoursWorked && input.hourlyRate ? input.hoursWorked * input.hourlyRate : 0) +
        (input.bonusAmount || 0) -
        (input.deductionAmount || 0);

      // Calculate advance deduction from unsettled advances
      let advanceDeduction = input.advanceDeduction || 0;
      const unsettledAdvances = await AdvancePayment.find({
        staffId: new mongoose.Types.ObjectId(input.staffId),
        paymentStatus: 'paid',
        isSettled: false
      }).sort({ createdAt: 1 }); // Oldest first

      // If advance deduction not explicitly provided, calculate from unsettled advances
      if (!input.advanceDeduction && unsettledAdvances.length > 0) {
        // Deduct all unsettled advances, but cap to available salary
        const totalUnsettled = unsettledAdvances.reduce((sum, advance) => sum + advance.amount, 0);
        advanceDeduction = Math.min(totalUnsettled, Math.max(0, availableSalary));
      } else if (advanceDeduction > 0) {
        // Cap advance deduction to available salary (standard salary management practice)
        // Employee cannot receive negative payment - only deduct what's available
        advanceDeduction = Math.min(advanceDeduction, Math.max(0, availableSalary));
      }

      // Calculate final total amount
      const finalTotalAmount = Math.max(0, availableSalary - advanceDeduction);

      const payment = new SalaryPayment({
        staffId: new mongoose.Types.ObjectId(input.staffId),
        restaurantId: new mongoose.Types.ObjectId(input.restaurantId),
        paymentPeriodStart: new Date(input.paymentPeriodStart),
        paymentPeriodEnd: new Date(input.paymentPeriodEnd),
        baseAmount: input.baseAmount,
        hoursWorked: input.hoursWorked,
        hourlyRate: input.hourlyRate,
        advanceDeduction: advanceDeduction,
        bonusAmount: input.bonusAmount || 0,
        deductionAmount: input.deductionAmount || 0,
        totalAmount: finalTotalAmount,
        paymentStatus: input.paymentStatus || 'pending',
        paymentMethod: input.paymentMethod,
        paymentTransactionId: input.paymentTransactionId,
        notes: input.notes,
        createdBy: context.admin ? 'admin' : 'restaurant',
        createdById: context.admin?.id || context.restaurant?.id || ''
      });

      await payment.save();

      // Mark advances as settled if they were deducted
      if (advanceDeduction > 0 && unsettledAdvances.length > 0) {
        let remainingToSettle = advanceDeduction;
        for (const advance of unsettledAdvances) {
          if (remainingToSettle <= 0) break;
          
          const settleAmount = Math.min(advance.amount, remainingToSettle);
          if (settleAmount >= advance.amount) {
            // Fully settle this advance
            advance.isSettled = true;
            advance.settledAt = new Date();
            advance.settledByPaymentId = payment._id;
            await advance.save();
            remainingToSettle -= advance.amount;
          } else {
            // Partially settle - create a new advance for the remaining amount
            const remainingAdvance = new AdvancePayment({
              ...advance.toObject(),
              _id: undefined,
              amount: advance.amount - settleAmount,
              isSettled: false,
              settledAt: undefined,
              settledByPaymentId: undefined
            });
            await remainingAdvance.save();
            
            advance.isSettled = true;
            advance.settledAt = new Date();
            advance.settledByPaymentId = payment._id;
            advance.amount = settleAmount;
            await advance.save();
            remainingToSettle -= settleAmount;
          }
        }
      }

      // Create audit log
      const actorRole = context.admin ? 'admin' : 'restaurant';
      const actorId = context.admin?.id || context.restaurant?.id || '';
      await createAuditLog(
        actorRole,
        actorId,
        'CREATE_SALARY_PAYMENT',
        'SalaryPayment',
        payment._id.toString(),
        input.restaurantId,
        `Created salary payment for staff ${staff.name}`,
        { totalAmount: input.totalAmount, paymentStatus: payment.paymentStatus }
      );

      return {
        id: payment._id.toString(),
        staffId: payment.staffId.toString(),
        restaurantId: payment.restaurantId.toString(),
        paymentPeriodStart: payment.paymentPeriodStart.toISOString(),
        paymentPeriodEnd: payment.paymentPeriodEnd.toISOString(),
        baseAmount: payment.baseAmount,
        hoursWorked: payment.hoursWorked,
        hourlyRate: payment.hourlyRate,
        advanceDeduction: payment.advanceDeduction ?? 0,
        bonusAmount: payment.bonusAmount,
        deductionAmount: payment.deductionAmount,
        totalAmount: payment.totalAmount,
        paymentStatus: payment.paymentStatus,
        paymentMethod: payment.paymentMethod,
        paymentTransactionId: payment.paymentTransactionId,
        paidAt: payment.paidAt?.toISOString(),
        notes: payment.notes,
        createdBy: payment.createdBy,
        createdById: payment.createdById,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString()
      };
    },

    updateSalaryPayment: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
      if (!context.admin && !context.restaurant) {
        throw new Error('Access denied: Only admins and restaurants can update salary payments');
      }

      const payment = await SalaryPayment.findById(id);
      if (!payment) {
        throw new Error('Salary payment not found');
      }

      // Check access
      await canManageStaff(payment.staffId.toString(), context);

      // Validate payment status transitions
      const validTransitions: Record<string, string[]> = {
        'pending': ['paid', 'failed'],
        'paid': ['failed'], // Allow marking as failed if payment was reversed
        'failed': ['pending', 'paid'] // Allow retry
      };

      if (input.paymentStatus && payment.paymentStatus !== input.paymentStatus) {
        const allowedStatuses = validTransitions[payment.paymentStatus];
        if (!allowedStatuses || !allowedStatuses.includes(input.paymentStatus)) {
          throw new Error(`Invalid status transition from ${payment.paymentStatus} to ${input.paymentStatus}`);
        }

        // If marking as paid, set paidAt
        if (input.paymentStatus === 'paid' && !input.paidAt) {
          input.paidAt = new Date();
        }
      }

      // Calculate available salary (before advance deduction)
      // Use input values if provided, otherwise use existing payment values
      const baseAmount = input.baseAmount !== undefined ? input.baseAmount : payment.baseAmount;
      const hoursWorked = input.hoursWorked !== undefined ? input.hoursWorked : payment.hoursWorked;
      const hourlyRate = input.hourlyRate !== undefined ? input.hourlyRate : payment.hourlyRate;
      const bonusAmount = input.bonusAmount !== undefined ? (input.bonusAmount || 0) : (payment.bonusAmount || 0);
      const deductionAmount = input.deductionAmount !== undefined ? (input.deductionAmount || 0) : (payment.deductionAmount || 0);
      
      const availableSalary = baseAmount + 
        (hoursWorked && hourlyRate ? hoursWorked * hourlyRate : 0) +
        bonusAmount -
        deductionAmount;

      // Handle advance deduction changes
      const oldAdvanceDeduction = payment.advanceDeduction || 0;
      let newAdvanceDeduction = input.advanceDeduction !== undefined ? input.advanceDeduction : oldAdvanceDeduction;
      
      // Cap advance deduction to available salary (standard salary management practice)
      // Employee cannot receive negative payment - only deduct what's available
      if (newAdvanceDeduction > 0) {
        newAdvanceDeduction = Math.min(newAdvanceDeduction, Math.max(0, availableSalary));
      }
      
      const paymentId = new mongoose.Types.ObjectId(id);

      // If advance deduction decreased, unsettle advances that were settled by this payment
      if (newAdvanceDeduction < oldAdvanceDeduction) {
        const amountToUnsettle = oldAdvanceDeduction - newAdvanceDeduction;
        const settledAdvances = await AdvancePayment.find({
          staffId: payment.staffId,
          settledByPaymentId: paymentId,
          isSettled: true
        }).sort({ settledAt: -1 }); // Most recently settled first

        let remainingToUnsettle = amountToUnsettle;
        for (const advance of settledAdvances) {
          if (remainingToUnsettle <= 0) break;

          if (advance.amount <= remainingToUnsettle) {
            // Fully unsettle this advance
            advance.isSettled = false;
            delete (advance as any).settledAt;
            delete (advance as any).settledByPaymentId;
            await advance.save();
            remainingToUnsettle -= advance.amount;
          } else {
            // Partially unsettle - create a new unsettled advance for the remaining amount
            const unsettledAmount = remainingToUnsettle;
            const remainingSettledAmount = advance.amount - unsettledAmount;

            // Create new unsettled advance
            const newUnsettledAdvance = new AdvancePayment({
              staffId: advance.staffId,
              restaurantId: advance.restaurantId,
              amount: unsettledAmount,
              advanceDate: advance.advanceDate,
              paymentStatus: advance.paymentStatus,
              paymentMethod: advance.paymentMethod,
              paymentTransactionId: advance.paymentTransactionId,
              notes: advance.notes,
              isSettled: false,
              createdBy: advance.createdBy,
              createdById: advance.createdById
            });
            await newUnsettledAdvance.save();

            // Update the original advance to reflect the remaining settled amount
            advance.amount = remainingSettledAmount;
            await advance.save();
            remainingToUnsettle = 0;
          }
        }
      }

      const updateData: any = { ...input };
      
      // Update advance deduction with capped value
      if (input.advanceDeduction !== undefined) {
        updateData.advanceDeduction = newAdvanceDeduction;
      }
      
      // Recalculate total amount based on capped advance deduction
      const finalTotalAmount = Math.max(0, availableSalary - newAdvanceDeduction);
      updateData.totalAmount = finalTotalAmount;
      
      if (input.paymentPeriodStart) {
        updateData.paymentPeriodStart = new Date(input.paymentPeriodStart);
      }
      if (input.paymentPeriodEnd) {
        updateData.paymentPeriodEnd = new Date(input.paymentPeriodEnd);
      }
      if (input.paidAt) {
        updateData.paidAt = new Date(input.paidAt);
      }

      const updatedPayment = await SalaryPayment.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!updatedPayment) {
        throw new Error('Failed to update salary payment');
      }

      // Check if payment has advance deduction but no advances are settled by it
      // This handles the case where payments were created before the settlement logic was added
      const advancesSettledByThisPayment = await AdvancePayment.find({
        staffId: payment.staffId,
        settledByPaymentId: paymentId,
        isSettled: true
      });
      const totalSettledByThisPayment = advancesSettledByThisPayment.reduce((sum, a) => sum + a.amount, 0);
      
      // If payment has advance deduction but advances aren't settled, settle them now
      if (newAdvanceDeduction > 0 && totalSettledByThisPayment < newAdvanceDeduction) {
        const amountToSettle = newAdvanceDeduction - totalSettledByThisPayment;
        const unsettledAdvances = await AdvancePayment.find({
          staffId: payment.staffId,
          paymentStatus: 'paid',
          isSettled: false
        }).sort({ createdAt: 1 }); // Oldest first

        let remainingToSettle = amountToSettle;
        for (const advance of unsettledAdvances) {
          if (remainingToSettle <= 0) break;

          const settleAmount = Math.min(advance.amount, remainingToSettle);
          if (settleAmount >= advance.amount) {
            // Fully settle this advance
            advance.isSettled = true;
            advance.settledAt = new Date();
            advance.settledByPaymentId = paymentId;
            await advance.save();
            remainingToSettle -= advance.amount;
          } else {
            // Partially settle - create a new advance for the remaining amount
            const remainingAdvance = new AdvancePayment({
              staffId: advance.staffId,
              restaurantId: advance.restaurantId,
              amount: advance.amount - settleAmount,
              advanceDate: advance.advanceDate,
              paymentStatus: advance.paymentStatus,
              paymentMethod: advance.paymentMethod,
              paymentTransactionId: advance.paymentTransactionId,
              notes: advance.notes,
              isSettled: false,
              createdBy: advance.createdBy,
              createdById: advance.createdById
            });
            await remainingAdvance.save();

            // Update the original advance to reflect the settled amount
            advance.isSettled = true;
            advance.settledAt = new Date();
            advance.settledByPaymentId = paymentId;
            advance.amount = settleAmount;
            await advance.save();
            remainingToSettle -= settleAmount;
          }
        }
      } else if (newAdvanceDeduction > oldAdvanceDeduction) {
        // If advance deduction increased, settle additional advances
        const amountToSettle = newAdvanceDeduction - oldAdvanceDeduction;
        const unsettledAdvances = await AdvancePayment.find({
          staffId: payment.staffId,
          paymentStatus: 'paid',
          isSettled: false
        }).sort({ createdAt: 1 }); // Oldest first

        let remainingToSettle = amountToSettle;
        for (const advance of unsettledAdvances) {
          if (remainingToSettle <= 0) break;

          const settleAmount = Math.min(advance.amount, remainingToSettle);
          if (settleAmount >= advance.amount) {
            // Fully settle this advance
            advance.isSettled = true;
            advance.settledAt = new Date();
            advance.settledByPaymentId = paymentId;
            await advance.save();
            remainingToSettle -= advance.amount;
          } else {
            // Partially settle - create a new advance for the remaining amount
            const remainingAdvance = new AdvancePayment({
              staffId: advance.staffId,
              restaurantId: advance.restaurantId,
              amount: advance.amount - settleAmount,
              advanceDate: advance.advanceDate,
              paymentStatus: advance.paymentStatus,
              paymentMethod: advance.paymentMethod,
              paymentTransactionId: advance.paymentTransactionId,
              notes: advance.notes,
              isSettled: false,
              createdBy: advance.createdBy,
              createdById: advance.createdById
            });
            await remainingAdvance.save();

            // Update the original advance to reflect the settled amount
            advance.isSettled = true;
            advance.settledAt = new Date();
            advance.settledByPaymentId = paymentId;
            advance.amount = settleAmount;
            await advance.save();
            remainingToSettle -= settleAmount;
          }
        }
      }

      // Create audit log
      const actorRole = context.admin ? 'admin' : 'restaurant';
      const actorId = context.admin?.id || context.restaurant?.id || '';
      await createAuditLog(
        actorRole,
        actorId,
        'UPDATE_SALARY_PAYMENT',
        'SalaryPayment',
        id,
        updatedPayment.restaurantId.toString(),
        `Updated salary payment`,
        { changes: input, previousStatus: payment.paymentStatus, newStatus: updatedPayment.paymentStatus }
      );

      return {
        id: updatedPayment._id.toString(),
        staffId: updatedPayment.staffId.toString(),
        restaurantId: updatedPayment.restaurantId.toString(),
        paymentPeriodStart: updatedPayment.paymentPeriodStart.toISOString(),
        paymentPeriodEnd: updatedPayment.paymentPeriodEnd.toISOString(),
        baseAmount: updatedPayment.baseAmount,
        hoursWorked: updatedPayment.hoursWorked,
        hourlyRate: updatedPayment.hourlyRate,
        advanceDeduction: updatedPayment.advanceDeduction ?? 0,
        bonusAmount: updatedPayment.bonusAmount,
        deductionAmount: updatedPayment.deductionAmount,
        totalAmount: updatedPayment.totalAmount,
        paymentStatus: updatedPayment.paymentStatus,
        paymentMethod: updatedPayment.paymentMethod,
        paymentTransactionId: updatedPayment.paymentTransactionId,
        paidAt: updatedPayment.paidAt?.toISOString(),
        notes: updatedPayment.notes,
        createdBy: updatedPayment.createdBy,
        createdById: updatedPayment.createdById,
        createdAt: updatedPayment.createdAt.toISOString(),
        updatedAt: updatedPayment.updatedAt.toISOString()
      };
    },

    deleteSalaryPayment: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.admin && !context.restaurant) {
        throw new Error('Access denied: Only admins and restaurants can delete salary payments');
      }

      const payment = await SalaryPayment.findById(id);
      if (!payment) {
        throw new Error('Salary payment not found');
      }

      // Check access
      await canManageStaff(payment.staffId.toString(), context);

      // Only allow deletion of pending payments
      if (payment.paymentStatus !== 'pending') {
        throw new Error('Cannot delete payment that is not pending. Only pending payments can be deleted.');
      }

      await SalaryPayment.findByIdAndDelete(id);

      // Create audit log
      const actorRole = context.admin ? 'admin' : 'restaurant';
      const actorId = context.admin?.id || context.restaurant?.id || '';
      await createAuditLog(
        actorRole,
        actorId,
        'DELETE_SALARY_PAYMENT',
        'SalaryPayment',
        id,
        payment.restaurantId.toString(),
        `Deleted salary payment`,
        { totalAmount: payment.totalAmount }
      );

      return true;
    },

    createAdvancePayment: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const { staff } = await canManageStaff(input.staffId, context);

      // Validate restaurant exists
      const restaurant = await Restaurant.findById(input.restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Validate staff belongs to restaurant
      if (staff.restaurantId.toString() !== input.restaurantId) {
        throw new Error('Staff does not belong to the specified restaurant');
      }

      const advance = new AdvancePayment({
        staffId: new mongoose.Types.ObjectId(input.staffId),
        restaurantId: new mongoose.Types.ObjectId(input.restaurantId),
        amount: input.amount,
        advanceDate: parseLocalDateString(input.advanceDate),
        paymentStatus: input.paymentStatus || 'paid',
        paymentMethod: input.paymentMethod,
        paymentTransactionId: input.paymentTransactionId,
        notes: input.notes,
        isSettled: false,
        createdBy: context.admin ? 'admin' : 'restaurant',
        createdById: context.admin?.id || context.restaurant?.id || '',
        paidAt: input.paymentStatus === 'paid' ? new Date() : undefined
      });

      await advance.save();

      // Create audit log
      const actorRole = context.admin ? 'admin' : 'restaurant';
      const actorId = context.admin?.id || context.restaurant?.id || '';
      await createAuditLog(
        actorRole,
        actorId,
        'CREATE_ADVANCE_PAYMENT',
        'AdvancePayment',
        advance._id.toString(),
        input.restaurantId,
        `Created advance payment for staff ${staff.name}`,
        { amount: input.amount }
      );

      return {
        id: advance._id.toString(),
        staffId: advance.staffId.toString(),
        restaurantId: advance.restaurantId.toString(),
        amount: advance.amount,
        advanceDate: formatDateAsString(advance.advanceDate || advance.paidAt || advance.createdAt),
        paymentStatus: advance.paymentStatus,
        paymentMethod: advance.paymentMethod,
        paymentTransactionId: advance.paymentTransactionId,
        paidAt: advance.paidAt?.toISOString(),
        notes: advance.notes,
        isSettled: advance.isSettled,
        settledAt: advance.settledAt?.toISOString(),
        settledByPaymentId: advance.settledByPaymentId?.toString(),
        createdBy: advance.createdBy,
        createdById: advance.createdById,
        createdAt: advance.createdAt.toISOString(),
        updatedAt: advance.updatedAt.toISOString()
      };
    },

    updateAdvancePayment: async (_: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
      if (!context.admin && !context.restaurant) {
        throw new Error('Access denied: Only admins and restaurants can update advance payments');
      }

      const advance = await AdvancePayment.findById(id);
      if (!advance) {
        throw new Error('Advance payment not found');
      }

      // Check access
      await canManageStaff(advance.staffId.toString(), context);

      // Don't allow updating settled advances
      if (advance.isSettled) {
        throw new Error('Cannot update a settled advance payment');
      }

      const updateData: any = { ...input };
      if (input.advanceDate) {
        updateData.advanceDate = parseLocalDateString(input.advanceDate);
      }
      if (input.paidAt) {
        updateData.paidAt = new Date(input.paidAt);
      }

      const updatedAdvance = await AdvancePayment.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!updatedAdvance) {
        throw new Error('Failed to update advance payment');
      }

      // Create audit log
      const actorRole = context.admin ? 'admin' : 'restaurant';
      const actorId = context.admin?.id || context.restaurant?.id || '';
      await createAuditLog(
        actorRole,
        actorId,
        'UPDATE_ADVANCE_PAYMENT',
        'AdvancePayment',
        id,
        updatedAdvance.restaurantId.toString(),
        `Updated advance payment`,
        { changes: input }
      );

      return {
        id: updatedAdvance._id.toString(),
        staffId: updatedAdvance.staffId.toString(),
        restaurantId: updatedAdvance.restaurantId.toString(),
        amount: updatedAdvance.amount,
        advanceDate: formatDateAsString(updatedAdvance.advanceDate || updatedAdvance.paidAt || updatedAdvance.createdAt),
        paymentStatus: updatedAdvance.paymentStatus,
        paymentMethod: updatedAdvance.paymentMethod,
        paymentTransactionId: updatedAdvance.paymentTransactionId,
        paidAt: updatedAdvance.paidAt?.toISOString(),
        notes: updatedAdvance.notes,
        isSettled: updatedAdvance.isSettled,
        settledAt: updatedAdvance.settledAt?.toISOString(),
        settledByPaymentId: updatedAdvance.settledByPaymentId?.toString(),
        createdBy: updatedAdvance.createdBy,
        createdById: updatedAdvance.createdById,
        createdAt: updatedAdvance.createdAt.toISOString(),
        updatedAt: updatedAdvance.updatedAt.toISOString()
      };
    },

    deleteAdvancePayment: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.admin && !context.restaurant) {
        throw new Error('Access denied: Only admins and restaurants can delete advance payments');
      }

      const advance = await AdvancePayment.findById(id);
      if (!advance) {
        throw new Error('Advance payment not found');
      }

      // Check access
      await canManageStaff(advance.staffId.toString(), context);

      // Don't allow deleting settled advances
      if (advance.isSettled) {
        throw new Error('Cannot delete a settled advance payment');
      }

      await AdvancePayment.findByIdAndDelete(id);

      // Create audit log
      const actorRole = context.admin ? 'admin' : 'restaurant';
      const actorId = context.admin?.id || context.restaurant?.id || '';
      await createAuditLog(
        actorRole,
        actorId,
        'DELETE_ADVANCE_PAYMENT',
        'AdvancePayment',
        id,
        advance.restaurantId.toString(),
        `Deleted advance payment`,
        { amount: advance.amount }
      );

      return true;
    }
  }
};

