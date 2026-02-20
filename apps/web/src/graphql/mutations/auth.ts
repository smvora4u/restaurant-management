import { gql } from '@apollo/client';

export const LOGIN_RESTAURANT = gql`
  mutation LoginRestaurant($email: String!, $password: String!) {
    loginRestaurant(email: $email, password: $password) {
      token
      restaurant {
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
      }
    }
  }
`;

export const REGISTER_RESTAURANT = gql`
  mutation RegisterRestaurant($input: RestaurantInput!) {
    registerRestaurant(input: $input) {
      token
      restaurant {
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
      }
    }
  }
`;

export const LOGIN_ADMIN = gql`
  mutation LoginAdmin($email: String!, $password: String!) {
    loginAdmin(email: $email, password: $password) {
      token
      admin {
        id
        name
        email
        role
        permissions
        isActive
      }
    }
  }
`;

export const LOGIN_STAFF = gql`
  mutation LoginStaff($email: String!, $password: String!) {
    loginStaff(email: $email, password: $password) {
      token
      staff {
        id
        name
        email
        role
        permissions
        restaurantId
        isActive
      }
      restaurant {
        id
        name
        email
        slug
        address
        phone
        settings {
          currency
          timezone
          theme
          billSize
        }
        isActive
      }
    }
  }
`;
