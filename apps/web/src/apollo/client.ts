import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'http://localhost:4000/graphql',
});

const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage
  const adminToken = localStorage.getItem('adminToken');
  const restaurantToken = localStorage.getItem('restaurantToken');
  
  // Get restaurant context for consumer pages
  const currentRestaurant = localStorage.getItem('currentRestaurant');
  let restaurantContext = {};
  
  if (currentRestaurant) {
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
      authorization: adminToken || restaurantToken ? `Bearer ${adminToken || restaurantToken}` : "",
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
