import { gql } from '@apollo/client';

export const GET_ALL_RESTAURANTS = gql`
  query GetAllRestaurants {
    allRestaurants {
      id
      name
      slug
      email
      address
      phone
      settings {
        currency
        timezone
        theme
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_RESTAURANT_BY_ID = gql`
  query GetRestaurantById($id: ID!) {
    restaurantById(id: $id) {
      id
      name
      slug
      email
      address
      phone
      settings {
        currency
        timezone
        theme
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_RESTAURANT_BY_SLUG = gql`
  query GetRestaurantBySlug($slug: String!) {
    restaurantBySlug(slug: $slug) {
      id
      name
      slug
      email
      address
      phone
      settings {
        currency
        timezone
        theme
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Note: GET_ORDER_BY_ID_FOR_RESTAURANT is now consolidated into GET_ORDER_BY_ID in orders.ts

