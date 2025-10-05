import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = createHttpLink({
  uri: 'http://localhost:4000/graphql',
});

// Create WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:4000/graphql',
  connectionParams: () => {
    // Get the authentication token from local storage
    const adminToken = localStorage.getItem('adminToken');
    const restaurantToken = localStorage.getItem('restaurantToken');
    const staffToken = localStorage.getItem('staffToken');
    
    // Get restaurant context for consumer pages
    const currentRestaurant = localStorage.getItem('currentRestaurant');
    let restaurantContext = {};
    
    if (currentRestaurant && !adminToken && !staffToken) {
      try {
        const restaurant = JSON.parse(currentRestaurant);
        restaurantContext = {
          'x-restaurant-id': restaurant.id,
          'x-restaurant-slug': restaurant.slug
        };
      } catch (error) {
        console.error('Error parsing restaurant context:', error);
      }
    }
    
    return {
      authorization: adminToken || restaurantToken || staffToken ? `Bearer ${adminToken || restaurantToken || staffToken}` : "",
      ...restaurantContext
    };
  },
}));

const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage
  const adminToken = localStorage.getItem('adminToken');
  const restaurantToken = localStorage.getItem('restaurantToken');
  const staffToken = localStorage.getItem('staffToken');
  
  
  // Get restaurant context for consumer pages (only if no admin/staff token)
  const currentRestaurant = localStorage.getItem('currentRestaurant');
  let restaurantContext = {};
  
  // Only add restaurant context if we don't have admin or staff tokens
  if (currentRestaurant && !adminToken && !staffToken) {
    try {
      const restaurant = JSON.parse(currentRestaurant);
      restaurantContext = {
        'x-restaurant-id': restaurant.id,
        'x-restaurant-slug': restaurant.slug
      };
    } catch (error) {
      console.error('Error parsing restaurant context:', error);
    }
  }
  
  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: adminToken || restaurantToken || staffToken ? `Bearer ${adminToken || restaurantToken || staffToken}` : "",
      ...restaurantContext
    }
  }
});

// Split the link based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([authLink, httpLink])
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});