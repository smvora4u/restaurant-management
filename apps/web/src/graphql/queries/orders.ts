import { gql } from '@apollo/client';

export const GET_ORDERS = gql`
  query GetOrders {
    orders {
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

export const GET_ORDER_BY_ID = gql`
  query GetOrderById($id: ID!) {
    order(id: $id) {
      id
      restaurantId
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
      paid
      paidAt
      paymentMethod
      paymentTransactionId
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

export const GET_ORDER_BY_TABLE = gql`
  query GetOrderByTable($tableNumber: Int!) {
    orderByTable(tableNumber: $tableNumber) {
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

export const GET_ORDERS_BY_SESSION = gql`
  query GetOrdersBySession($sessionId: String!, $orderType: String!) {
    ordersBySession(sessionId: $sessionId, orderType: $orderType) {
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

export const GET_ORDERS_BY_USER = gql`
  query GetOrdersByUser($userId: String!, $orderType: String!) {
    ordersByUser(userId: $userId, orderType: $orderType) {
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

export const GET_ORDERS_BY_MOBILE = gql`
  query GetOrdersByMobile($mobileNumber: String!, $orderType: String!) {
    ordersByMobile(mobileNumber: $mobileNumber, orderType: $orderType) {
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

export const GET_USER_TABLE_ORDERS = gql`
  query GetUserTableOrders($mobileNumber: String!) {
    ordersByMobile(mobileNumber: $mobileNumber, orderType: "dine-in") {
      id
      tableNumber
      orderType
      status
      customerPhone
      items {
        menuItemId
        quantity
        status
      }
    }
  }
`;

export const GET_AVAILABLE_TABLES = gql`
  query GetAvailableTables {
    availableTables {
      id
      number
      capacity
      status
      location
    }
  }
`;