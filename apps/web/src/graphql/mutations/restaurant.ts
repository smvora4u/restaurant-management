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
