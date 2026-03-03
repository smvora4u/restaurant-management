import { gql } from '@apollo/client';

export const WAITLIST_UPDATED_SUBSCRIPTION = gql`
  subscription WaitlistUpdated($restaurantId: ID!) {
    waitlistUpdated(restaurantId: $restaurantId) {
      restaurantId
      updatedAt
    }
  }
`;
