import { gql } from '@apollo/client';

export const FEE_LEDGER_UPDATED_SUBSCRIPTION = gql`
  subscription FeeLedgerUpdated {
    feeLedgerUpdated {
      id
      restaurantId
      orderId
      orderTotal
      feeMode
      feeRate
      feeAmount
      currency
      discountApplied
      paymentStatus
      paymentMethod
      paymentTransactionId
      paidAt
      createdAt
    }
  }
`;

export const PAYMENT_STATUS_UPDATED_SUBSCRIPTION = gql`
  subscription PaymentStatusUpdated {
    paymentStatusUpdated {
      id
      restaurantId
      orderId
      orderTotal
      feeMode
      feeRate
      feeAmount
      currency
      discountApplied
      paymentStatus
      paymentMethod
      paymentTransactionId
      paidAt
      createdAt
    }
  }
`;

export const DUE_FEES_UPDATED_SUBSCRIPTION = gql`
  subscription DueFeesUpdated($restaurantId: ID!) {
    dueFeesUpdated(restaurantId: $restaurantId) {
      restaurantId
      totalDueFees
      pendingCount
      updatedAt
    }
  }
`;
