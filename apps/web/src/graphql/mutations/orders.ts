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

export const DELETE_ORDER = gql`
  mutation DeleteOrder($id: ID!) {
    deleteOrder(id: $id)
  }
`;

export const PAY_ORDER = gql`
  mutation PayOrder($orderId: ID!, $paymentMethod: String!, $tip: Float) {
    payOrder(orderId: $orderId, paymentMethod: $paymentMethod, tip: $tip) {
      id
      status
      paidAt
      finalTotal
    }
  }
`;

export const MARK_ORDER_PAID = gql`
  mutation MarkOrderPaid($id: ID!, $paymentMethod: String!, $paymentTransactionId: String) {
    markOrderPaid(id: $id, paymentMethod: $paymentMethod, paymentTransactionId: $paymentTransactionId) {
      id
      status
      paid
      paidAt
      paymentMethod
      paymentTransactionId
      totalAmount
    }
  }
`;