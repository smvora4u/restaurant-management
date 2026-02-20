import { gql } from '@apollo/client';

export const REQUEST_NETWORK_PRINT = gql`
  mutation RequestNetworkPrint($orderId: ID!) {
    requestNetworkPrint(orderId: $orderId)
  }
`;
