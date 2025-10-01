import { gql } from '@apollo/client';

export const CREATE_RESERVATION = gql`
  mutation CreateReservation($input: ReservationInput!) {
    createReservation(input: $input) {
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

export const UPDATE_RESERVATION = gql`
  mutation UpdateReservation($id: ID!, $input: ReservationInput!) {
    updateReservation(id: $id, input: $input) {
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

export const DELETE_RESERVATION = gql`
  mutation DeleteReservation($id: ID!) {
    deleteReservation(id: $id)
  }
`;
