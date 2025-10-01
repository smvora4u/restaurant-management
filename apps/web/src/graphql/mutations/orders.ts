import { gql } from '@apollo/client';

export const CREATE_ORDER = gql`
  mutation CreateOrder($input: OrderInput!) {
    createOrder(input: $input) {
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

export const UPDATE_ORDER = gql`
  mutation UpdateOrder($id: ID!, $input: OrderInput!) {
    updateOrder(id: $id, input: $input) {
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

export const UPDATE_ORDER_ITEM_STATUS = gql`
  mutation UpdateOrderItemStatus($orderId: ID!, $itemIndex: Int!, $status: String!) {
    updateOrderItemStatus(orderId: $orderId, itemIndex: $itemIndex, status: $status) {
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

export const DELETE_ORDER = gql`
  mutation DeleteOrder($id: ID!) {
    deleteOrder(id: $id)
  }
`;
