import { gql } from '@apollo/client';

export const SET_RESTAURANT_FEE_CONFIG = gql`
  mutation SetRestaurantFeeConfig($restaurantId: ID!, $mode: String!, $amount: Float!, $freeOrdersRemaining: Int) {
    setRestaurantFeeConfig(restaurantId: $restaurantId, mode: $mode, amount: $amount, freeOrdersRemaining: $freeOrdersRemaining) {
      restaurantId
      mode
      amount
      freeOrdersRemaining
      updatedAt
    }
  }
`;

export const UPDATE_FEE_PAYMENT_STATUS = gql`
  mutation UpdateFeePaymentStatus($feeLedgerId: ID!, $paymentStatus: String!, $paymentMethod: String, $paymentTransactionId: String, $reason: String) {
    updateFeePaymentStatus(feeLedgerId: $feeLedgerId, paymentStatus: $paymentStatus, paymentMethod: $paymentMethod, paymentTransactionId: $paymentTransactionId, reason: $reason) {
      id
      paymentStatus
      paymentMethod
      paymentTransactionId
      paidAt
    }
  }
`;

export const PAY_PLATFORM_FEES = gql`
  mutation PayPlatformFees($restaurantId: ID!, $paymentMethod: String!, $paymentTransactionId: String!) {
    payPlatformFees(restaurantId: $restaurantId, paymentMethod: $paymentMethod, paymentTransactionId: $paymentTransactionId) {
      success
      message
      paidFeesCount
      totalAmountPaid
      transactionId
    }
  }
`;

export const GENERATE_WEEKLY_SETTLEMENT = gql`
  mutation GenerateWeeklySettlement($restaurantId: ID!, $periodStart: String!, $periodEnd: String!) {
    generateWeeklySettlement(restaurantId: $restaurantId, periodStart: $periodStart, periodEnd: $periodEnd) {
      id
      restaurantId
      currency
      periodStart
      periodEnd
      totalOrders
      totalOrderAmount
      totalFees
      generatedAt
    }
  }
`;


export const CREATE_ADMIN = gql`
  mutation CreateAdmin($input: AdminInput!) {
    createAdmin(input: $input) {
      id
      name
      email
      role
      permissions
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const DEACTIVATE_RESTAURANT = gql`
  mutation DeactivateRestaurant($id: ID!) {
    deactivateRestaurant(id: $id) {
      id
      isActive
    }
  }
`;

export const CREATE_SAMPLE_DATA = gql`
  mutation CreateSampleDataForRestaurant($restaurantId: ID!) {
    createSampleDataForRestaurant(restaurantId: $restaurantId) {
      success
      message
    }
  }
`;