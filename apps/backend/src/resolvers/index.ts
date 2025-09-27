import { queryResolvers } from './queries.js';
import { mutationResolvers } from './mutations.js';

export const resolvers = {
  Query: queryResolvers,
  Mutation: mutationResolvers,
};
