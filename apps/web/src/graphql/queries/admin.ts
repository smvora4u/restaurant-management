import { gql } from '@apollo/client';

export const GET_PLATFORM_ANALYTICS = gql`
  query GetPlatformAnalytics {
    platformAnalytics {
      totalRestaurants
      activeRestaurants
      totalOrders
      totalRevenue
    }
  }
`;


export const GET_ALL_ORDERS = gql`
  query GetAllOrders($limit: Int, $offset: Int) {
    allOrders(limit: $limit, offset: $offset) {
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

export const GET_AUDIT_LOGS = gql`
  query GetAuditLogs($limit: Int, $offset: Int, $action: String, $entityType: String, $restaurantId: ID) {
    auditLogs(limit: $limit, offset: $offset, action: $action, entityType: $entityType, restaurantId: $restaurantId) {
      id
      actorRole
      actorId
      action
      entityType
      entityId
      reason
      details
      restaurantId
      createdAt
    }
  }
`;  

