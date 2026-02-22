import { gql } from '@apollo/client';

export const REQUEST_NETWORK_PRINT = gql`
  mutation RequestNetworkPrint($orderId: ID!) {
    requestNetworkPrint(orderId: $orderId)
  }
`;

export const REQUEST_TEST_PRINT = gql`
  mutation RequestTestPrint($restaurantId: ID!) {
    requestTestPrint(restaurantId: $restaurantId)
  }
`;
