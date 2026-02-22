import { gql } from '@apollo/client';

export const PRINTER_PROXY_STATUS = gql`
  query PrinterProxyStatus($restaurantId: ID!) {
    printerProxyStatus(restaurantId: $restaurantId) {
      connected
    }
  }
`;
