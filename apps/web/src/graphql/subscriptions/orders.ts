import { gql } from '@apollo/client';

export const ORDER_UPDATED_SUBSCRIPTION = gql`
  subscription OrderUpdated($restaurantId: ID!) {
    orderUpdated(restaurantId: $restaurantId) {
      id
      status
      totalAmount
      items {
        menuItemId
        quantity
        price
        status
        specialInstructions
      }
      updatedAt
    }
  }
`;

export const ORDER_ITEM_STATUS_UPDATED_SUBSCRIPTION = gql`
  subscription OrderItemStatusUpdated($restaurantId: ID!) {
    orderItemStatusUpdated(restaurantId: $restaurantId) {
      id
      status
      totalAmount
      items {
        menuItemId
        quantity
        price
        status
        specialInstructions
      }
      updatedAt
    }
  }
`;

export const NEW_ORDER_SUBSCRIPTION = gql`
  subscription NewOrder($restaurantId: ID!) {
    newOrder(restaurantId: $restaurantId) {
      id
      restaurantId
      tableNumber
      orderType
      items {
        menuItemId
        quantity
        specialInstructions
        price
        status
      }
      status
      totalAmount
      customerName
      customerPhone
      notes
      sessionId
      userId
      createdAt
      updatedAt
    }
  }
`;
