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
        itemInstructions
        kitchenBoardClickIncrement
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
        itemInstructions
        kitchenBoardClickIncrement
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
        itemInstructions
        kitchenBoardClickIncrement
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_RESTAURANT_FOR_OWNER = gql`
  query GetRestaurantForOwner {
    restaurantForOwner {
      id
      name
      slug
      settings {
        currency
        timezone
        theme
        itemInstructions
        kitchenBoardClickIncrement
      }
    }
  }
`;

// Note: GET_ORDER_BY_ID_FOR_RESTAURANT is now consolidated into GET_ORDER_BY_ID in orders.ts

