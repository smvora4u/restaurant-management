import { queryResolvers } from './queries.js';
import { mutationResolvers } from './mutations.js';
import { restaurantAuthResolvers } from './restaurantAuth.js';
import { adminAuthResolvers } from './adminAuth.js';
import { adminQueries, adminMutations } from './adminManagement.js';
import { staffAuthResolvers } from './staffAuth.js';
import { staffManagementResolvers } from './staffManagement.js';

export const resolvers = {
  Query: {
    ...queryResolvers,
    ...adminQueries,
    ...staffManagementResolvers.Query,
  },
  Mutation: {
    ...mutationResolvers,
    ...restaurantAuthResolvers.Mutation,
    ...adminAuthResolvers.Mutation,
    ...adminMutations,
    ...staffAuthResolvers.Mutation,
    ...staffManagementResolvers.Mutation,
  },
};
