import { gql } from '@apollo/client';

export const CREATE_ADMIN = gql`
  mutation CreateAdmin($input: AdminInput!) {
    createAdmin(input: $input) {
      id
      name
      email
      role
      permissions
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

export const CREATE_SAMPLE_DATA = gql`
  mutation CreateSampleDataForRestaurant($restaurantId: ID!) {
    createSampleDataForRestaurant(restaurantId: $restaurantId) {
      success
      message
    }
  }
`;