import { gql } from '@apollo/client';

export const CREATE_RESTAURANT = gql`
  mutation CreateRestaurant($input: RestaurantInput!) {
    createRestaurant(input: $input) {
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
        billSize
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_RESTAURANT = gql`
  mutation UpdateRestaurant($id: ID!, $input: UpdateRestaurantInput!) {
    updateRestaurant(id: $id, input: $input) {
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
        billSize
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const DEACTIVATE_RESTAURANT = gql`
  mutation DeactivateRestaurant($id: ID!) {
    deactivateRestaurant(id: $id) {
      id
      isActive
    }
  }
`;

export const UPDATE_RESTAURANT_SETTINGS = gql`
  mutation UpdateRestaurantSettings($input: RestaurantSettingsInput!) {
    updateRestaurantSettings(input: $input) {
      id
      name
      slug
      settings {
        currency
        timezone
        theme
        billSize
        networkPrinter {
          host
          port
        }
      }
    }
  }
`;

export const DELETE_RESTAURANT = gql`
  mutation DeleteRestaurant($id: ID!) {
    deleteRestaurant(id: $id)
  }
`;

export const CREATE_SAMPLE_DATA_FOR_RESTAURANT = gql`
  mutation CreateSampleDataForRestaurant($restaurantId: ID!) {
    createSampleDataForRestaurant(restaurantId: $restaurantId) {
      success
      message
    }
  }
`;
