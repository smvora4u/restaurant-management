import { gql } from '@apollo/client';

export const GET_STAFF_BY_RESTAURANT = gql`
  query GetStaffByRestaurant($restaurantId: ID!) {
    staffByRestaurant(restaurantId: $restaurantId) {
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

export const GET_STAFF_BY_ID = gql`
  query GetStaffById($id: ID!) {
    staffById(id: $id) {
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

export const GET_ORDERS_FOR_STAFF = gql`
  query GetOrdersForStaff($restaurantId: ID!) {
    ordersForStaff(restaurantId: $restaurantId) {
      id
      tableNumber
      orderType
      status
      totalAmount
      customerName
      customerPhone
      createdAt
      items {
        menuItemId
        quantity
        price
        status
      }
    }
  }
`;

export const GET_ORDER_BY_ID_FOR_STAFF = gql`
  query GetOrderByIdForStaff($id: ID!) {
    order(id: $id) {
      id
      tableNumber
      orderType
      status
      totalAmount
      customerName
      customerPhone
      notes
      sessionId
      userId
      createdAt
      updatedAt
      items {
        menuItemId
        quantity
        price
        status
        specialInstructions
      }
    }
  }
`;
