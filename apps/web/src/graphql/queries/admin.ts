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

export const GET_RESTAURANT_FEE_CONFIG = gql`
  query GetRestaurantFeeConfig($restaurantId: ID!) {
    restaurantFeeConfig(restaurantId: $restaurantId) {
      restaurantId
      mode
      amount
      freeOrdersRemaining
      updatedAt
    }
  }
`;

export const GET_FEE_LEDGERS = gql`
  query GetFeeLedgers($restaurantId: ID!, $limit: Int, $offset: Int) {
    feeLedgers(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      data {
        id
        restaurantId
        orderId
        orderTotal
        feeMode
        feeRate
        feeAmount
        currency
        discountApplied
        paymentStatus
        paymentMethod
        paymentTransactionId
        paidAt
        createdAt
      }
      totalCount
    }
  }
`;

export const GET_DUE_FEES_SUMMARY = gql`
  query GetDueFeesSummary {
    dueFeesSummary {
      restaurantId
      restaurantName
      totalDueFees
      pendingCount
      currency
      lastPaymentDate
      oldestDueDate
    }
  }
`;

export const GET_SETTLEMENTS = gql`
  query GetSettlements($restaurantId: ID!, $limit: Int, $offset: Int) {
    settlements(restaurantId: $restaurantId, limit: $limit, offset: $offset) {
      id
      restaurantId
      currency
      periodStart
      periodEnd
      totalOrders
      totalOrderAmount
      totalFees
      generatedAt
    }
  }
`;

