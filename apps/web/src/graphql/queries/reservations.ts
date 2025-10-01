import { gql } from '@apollo/client';

export const GET_RESERVATIONS = gql`
  query GetReservations {
    reservations {
      id
      customerName
      customerPhone
      customerEmail
      tableNumber
      date
      time
      partySize
      status
      specialRequests
      createdAt
      updatedAt
    }
  }
`;

export const GET_RESERVATION_BY_ID = gql`
  query GetReservationById($id: ID!) {
    reservation(id: $id) {
      id
      customerName
      customerPhone
      customerEmail
      tableNumber
      date
      time
      partySize
      status
      specialRequests
      createdAt
      updatedAt
    }
  }
`;
