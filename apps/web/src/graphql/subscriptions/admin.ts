import { gql } from '@apollo/client';

export const AUDIT_LOG_CREATED_SUBSCRIPTION = gql`
  subscription AuditLogCreated {
    auditLogCreated {
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

export const RESTAURANT_UPDATED_SUBSCRIPTION = gql`
  subscription RestaurantUpdated {
    restaurantUpdated {
      id
      name
      email
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const STAFF_UPDATED_SUBSCRIPTION = gql`
  subscription StaffUpdated($restaurantId: ID!) {
    staffUpdated(restaurantId: $restaurantId) {
      id
      name
      email
      role
      permissions
      isActive
      restaurantId
      createdAt
      updatedAt
    }
  }
`;

export const PLATFORM_ANALYTICS_UPDATED_SUBSCRIPTION = gql`
  subscription PlatformAnalyticsUpdated {
    platformAnalyticsUpdated {
      totalRestaurants
      activeRestaurants
      totalOrders
      totalRevenue
    }
  }
`;


