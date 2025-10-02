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

