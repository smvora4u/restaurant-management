import { gql } from '@apollo/client';

// Admin Password Reset Mutations
export const RESET_ADMIN_PASSWORD = gql`
  mutation ResetAdminPassword($email: String!) {
    resetAdminPassword(email: $email) {
      success
      message
      token
    }
  }
`;

export const UPDATE_ADMIN_PASSWORD = gql`
  mutation UpdateAdminPassword($token: String!, $newPassword: String!) {
    updateAdminPassword(token: $token, newPassword: $newPassword) {
      success
      message
      token
    }
  }
`;

// Restaurant Password Reset Mutations
export const RESET_RESTAURANT_PASSWORD = gql`
  mutation ResetRestaurantPassword($email: String!) {
    resetRestaurantPassword(email: $email) {
      success
      message
      token
    }
  }
`;

export const UPDATE_RESTAURANT_PASSWORD = gql`
  mutation UpdateRestaurantPassword($token: String!, $newPassword: String!) {
    updateRestaurantPassword(token: $token, newPassword: $newPassword) {
      success
      message
      token
    }
  }
`;

// Staff Password Reset Mutations
export const RESET_STAFF_PASSWORD = gql`
  mutation ResetStaffPassword($email: String!) {
    resetStaffPassword(email: $email) {
      success
      message
      token
    }
  }
`;

export const UPDATE_STAFF_PASSWORD = gql`
  mutation UpdateStaffPassword($token: String!, $newPassword: String!) {
    updateStaffPassword(token: $token, newPassword: $newPassword) {
      success
      message
      token
    }
  }
`;
