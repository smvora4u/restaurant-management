import { gql } from '@apollo/client';

export const GET_WAITLIST = gql`
  query GetWaitlist {
    waitlist {
      id
      restaurantId
      customerName
      customerPhone
      partySize
      notes
      status
      queuePosition
      notifiedAt
      seatedAt
      assignedTableNumber
      createdAt
    }
  }
`;
