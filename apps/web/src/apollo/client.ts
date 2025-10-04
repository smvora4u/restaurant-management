import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'http://localhost:4000/graphql',
});

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

export const client = new ApolloClient({
  link: from([authLink, httpLink]),
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