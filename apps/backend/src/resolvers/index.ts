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
    id: (parent: any) => {
      return parent._id ? parent._id.toString() : parent.id;
    },
    vendorId: (parent: any) => {
      // Handle populated vendorId (document object) or ObjectId/string
      if (!parent.vendorId) return null;
      if (typeof parent.vendorId === 'object' && parent.vendorId._id) {
        // It's a populated document, return its _id as string
        return parent.vendorId._id.toString();
      }
      if (typeof parent.vendorId === 'object' && parent.vendorId.toString) {
        // It's an ObjectId, convert to string
        return parent.vendorId.toString();
      }
      // It's already a string
      return parent.vendorId;
    },
    vendor: async (parent: any) => {
      if (parent.vendor || parent.vendorId) {
        const { Vendor } = await import('../models/index.js');
        // Handle both populated document and ObjectId/string
        const vendorId = typeof parent.vendorId === 'object' && parent.vendorId._id 
          ? parent.vendorId._id 
          : (parent.vendorId || parent.vendor?._id || parent.vendor);
        return await Vendor.findById(vendorId);
      }
      return null;
    },
    items: async (parent: any) => {
      const { PurchaseItem } = await import('../models/index.js');
      return await PurchaseItem.find({ purchaseId: parent._id || parent.id }).populate('categoryId');
    }
  },
  PurchaseItem: {
    id: (parent: any) => {
      return parent._id ? parent._id.toString() : parent.id;
    },
    categoryId: (parent: any) => {
      // Handle populated categoryId (document object) or ObjectId/string
      if (!parent.categoryId) return null;
      if (typeof parent.categoryId === 'object' && parent.categoryId._id) {
        // It's a populated document, return its _id as string
        return parent.categoryId._id.toString();
      }
      if (typeof parent.categoryId === 'object' && parent.categoryId.toString) {
        // It's an ObjectId, convert to string
        return parent.categoryId.toString();
      }
      // It's already a string
      return parent.categoryId;
    },
    category: async (parent: any) => {
      if (parent.categoryId) {
        const { PurchaseCategory } = await import('../models/index.js');
        // Handle both populated document and ObjectId/string
        const categoryId = typeof parent.categoryId === 'object' && parent.categoryId._id 
          ? parent.categoryId._id 
          : parent.categoryId;
        return await PurchaseCategory.findById(categoryId);
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
