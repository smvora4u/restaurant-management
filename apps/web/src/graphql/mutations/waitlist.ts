import { gql } from '@apollo/client';

const WAITLIST_ENTRY_FRAGMENT = gql`
  fragment WaitlistEntryFields on WaitlistEntry {
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
`;

export const ADD_TO_WAITLIST = gql`
  mutation AddToWaitlist($input: WaitlistInput!) {
    addToWaitlist(input: $input) {
      ...WaitlistEntryFields
    }
  }
  ${WAITLIST_ENTRY_FRAGMENT}
`;

export const REMOVE_FROM_WAITLIST = gql`
  mutation RemoveFromWaitlist($id: ID!) {
    removeFromWaitlist(id: $id)
  }
`;

export const NOTIFY_WAITLIST_ENTRY = gql`
  mutation NotifyWaitlistEntry($id: ID!) {
    notifyWaitlistEntry(id: $id) {
      ...WaitlistEntryFields
    }
  }
  ${WAITLIST_ENTRY_FRAGMENT}
`;

export const SEAT_WAITLIST_ENTRY = gql`
  mutation SeatWaitlistEntry($id: ID!, $tableNumbers: [String!]!) {
    seatWaitlistEntry(id: $id, tableNumbers: $tableNumbers) {
      ...WaitlistEntryFields
    }
  }
  ${WAITLIST_ENTRY_FRAGMENT}
`;

export const LINK_TABLE_TO_ORDER = gql`
  mutation LinkTableToOrder($orderId: ID!, $tableNumber: String!) {
    linkTableToOrder(orderId: $orderId, tableNumber: $tableNumber) {
      id
      tableNumber
      linkedTableNumbers
    }
  }
`;
