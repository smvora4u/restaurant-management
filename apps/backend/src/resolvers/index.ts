import { queryResolvers } from './queries.js';
import { mutationResolvers } from './mutations.js';
import { restaurantAuthResolvers } from './restaurantAuth.js';
import { adminAuthResolvers } from './adminAuth.js';
import { adminQueries, adminMutations } from './adminManagement.js';

export const resolvers = {
  Query: {
    ...queryResolvers,
    ...adminQueries,
  },
  Mutation: {
    ...mutationResolvers,
    ...restaurantAuthResolvers.Mutation,
    ...adminAuthResolvers.Mutation,
    ...adminMutations,
  },
};
