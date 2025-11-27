import { queryResolvers } from './queries.js';
import { mutationResolvers } from './mutations.js';
import { restaurantAuthResolvers } from './restaurantAuth.js';
import { adminAuthResolvers } from './adminAuth.js';
import { adminQueries, adminMutations } from './adminManagement.js';
import { staffAuthResolvers } from './staffAuth.js';
import { staffManagementResolvers } from './staffManagement.js';
import { salaryManagementResolvers } from './salaryManagement.js';
import { subscriptionResolvers } from './subscriptions.js';

export const resolvers = {
  Staff: {
    ...salaryManagementResolvers.Staff
  },
  Purchase: {
    vendor: async (parent: any) => {
      if (parent.vendor || parent.vendorId) {
        const { Vendor } = await import('../models/index.js');
        return await Vendor.findById(parent.vendorId || parent.vendor?._id || parent.vendor);
      }
      return null;
    },
    items: async (parent: any) => {
      const { PurchaseItem } = await import('../models/index.js');
      return await PurchaseItem.find({ purchaseId: parent._id || parent.id }).populate('categoryId');
    }
  },
  PurchaseItem: {
    category: async (parent: any) => {
      if (parent.categoryId) {
        const { PurchaseCategory } = await import('../models/index.js');
        return await PurchaseCategory.findById(parent.categoryId);
      }
      return null;
    }
  },
  Query: {
    ...queryResolvers,
    ...adminQueries,
    auditLogs: async (_: any, { limit = 50, offset = 0, action, entityType, restaurantId }: any, __: any, ___: any) => {
      const { AuditLog } = await import('../models/index.js');
      const filter: any = {};
      if (action) filter.action = action;
      if (entityType) filter.entityType = entityType;
      if (restaurantId) filter.restaurantId = restaurantId;
      return await (AuditLog as any).find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit);
    },
    ...staffManagementResolvers.Query,
    ...salaryManagementResolvers.Query,
  },
  Mutation: {
    ...mutationResolvers,
    ...restaurantAuthResolvers.Mutation,
    ...adminAuthResolvers.Mutation,
    ...adminMutations,
    ...staffAuthResolvers.Mutation,
    ...staffManagementResolvers.Mutation,
    ...salaryManagementResolvers.Mutation,
    createAuditLog: async (_: any, { input }: any) => {
      const { AuditLog } = await import('../models/index.js');
      const { publishAuditLogCreated } = await import('./subscriptions.js');
      const log = await (AuditLog as any).create({ ...input });
      publishAuditLogCreated({
        id: log._id,
        actorRole: log.actorRole,
        actorId: log.actorId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        reason: log.reason,
        details: log.details,
        restaurantId: log.restaurantId,
        createdAt: log.createdAt
      });
      return log;
    }
  },
  Subscription: {
    ...subscriptionResolvers.Subscription,
  },
};
