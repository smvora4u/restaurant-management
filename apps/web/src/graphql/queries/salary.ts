import { gql } from '@apollo/client';

export const GET_STAFF_SALARY_CONFIG = gql`
  query GetStaffSalaryConfig($staffId: ID!) {
    staffSalaryConfig(staffId: $staffId) {
      id
      staffId
      restaurantId
      salaryType
      baseSalary
      hourlyRate
      currency
      paymentFrequency
      effectiveDate
      notes
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_STAFF_SALARY_PAYMENTS = gql`
  query GetStaffSalaryPayments($staffId: ID!, $limit: Int, $offset: Int) {
    staffSalaryPayments(staffId: $staffId, limit: $limit, offset: $offset) {
      data {
        id
        staffId
        restaurantId
        paymentPeriodStart
        paymentPeriodEnd
        baseAmount
        hoursWorked
        hourlyRate
        bonusAmount
        deductionAmount
        advanceDeduction
        totalAmount
        paymentStatus
        paymentMethod
        paymentTransactionId
        paidAt
        notes
        createdBy
        createdById
        createdAt
        updatedAt
      }
      totalCount
    }
  }
`;

export const GET_STAFF_SALARY_SUMMARY = gql`
  query GetStaffSalarySummary($staffId: ID!) {
    staffSalarySummary(staffId: $staffId) {
      staffId
      staffName
      totalPaid
      totalPending
      totalFailed
      paymentCount
      lastPaymentDate
      currency
    }
  }
`;

export const GET_ALL_STAFF_SALARY_PAYMENTS = gql`
  query GetAllStaffSalaryPayments($restaurantId: ID!, $limit: Int, $offset: Int, $paymentStatus: String) {
    allStaffSalaryPayments(restaurantId: $restaurantId, limit: $limit, offset: $offset, paymentStatus: $paymentStatus) {
      data {
        id
        staffId
        restaurantId
        paymentPeriodStart
        paymentPeriodEnd
        baseAmount
        hoursWorked
        hourlyRate
        bonusAmount
        deductionAmount
        advanceDeduction
        totalAmount
        paymentStatus
        paymentMethod
        paymentTransactionId
        paidAt
        notes
        createdBy
        createdById
        createdAt
        updatedAt
      }
      totalCount
    }
  }
`;

export const GET_STAFF_ADVANCE_PAYMENTS = gql`
  query GetStaffAdvancePayments($staffId: ID!, $limit: Int, $offset: Int, $isSettled: Boolean) {
    staffAdvancePayments(staffId: $staffId, limit: $limit, offset: $offset, isSettled: $isSettled) {
      data {
        id
        staffId
        restaurantId
        amount
        paymentStatus
        paymentMethod
        paymentTransactionId
        paidAt
        notes
        isSettled
        settledAt
        settledByPaymentId
        createdBy
        createdById
        createdAt
        updatedAt
      }
      totalCount
    }
  }
`;

export const GET_STAFF_ADVANCE_SUMMARY = gql`
  query GetStaffAdvanceSummary($staffId: ID!) {
    staffAdvanceSummary(staffId: $staffId) {
      staffId
      totalAdvance
      totalSettled
      pendingSettlement
      unsettledCount
      currency
    }
  }
`;

