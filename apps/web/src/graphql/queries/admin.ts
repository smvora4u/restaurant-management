import { gql } from '@apollo/client';

export const GET_PLATFORM_ANALYTICS = gql`
  query GetPlatformAnalytics {
    platformAnalytics {
      totalRestaurants
      activeRestaurants
      totalOrders
      totalRevenue
      averageOrderValue
      topRestaurants {
        id
        name
        orderCount
        revenue
      }
    }
  }
`;

export const GET_ALL_ORDERS = gql`
  query GetAllOrders($limit: Int, $offset: Int) {
    allOrders(limit: $limit, offset: $offset) {
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
