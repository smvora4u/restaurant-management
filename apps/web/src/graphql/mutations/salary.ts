import { gql } from '@apollo/client';

export const SET_STAFF_SALARY_CONFIG = gql`
  mutation SetStaffSalaryConfig($input: SalaryConfigInput!) {
    setStaffSalaryConfig(input: $input) {
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

export const UPDATE_STAFF_SALARY_CONFIG = gql`
  mutation UpdateStaffSalaryConfig($id: ID!, $input: UpdateSalaryConfigInput!) {
    updateStaffSalaryConfig(id: $id, input: $input) {
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

export const CREATE_SALARY_PAYMENT = gql`
  mutation CreateSalaryPayment($input: SalaryPaymentInput!) {
    createSalaryPayment(input: $input) {
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
  }
`;

export const UPDATE_SALARY_PAYMENT = gql`
  mutation UpdateSalaryPayment($id: ID!, $input: UpdateSalaryPaymentInput!) {
    updateSalaryPayment(id: $id, input: $input) {
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
  }
`;

export const DELETE_SALARY_PAYMENT = gql`
  mutation DeleteSalaryPayment($id: ID!) {
    deleteSalaryPayment(id: $id)
  }
`;

export const CREATE_ADVANCE_PAYMENT = gql`
  mutation CreateAdvancePayment($input: AdvancePaymentInput!) {
    createAdvancePayment(input: $input) {
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
  }
`;

export const UPDATE_ADVANCE_PAYMENT = gql`
  mutation UpdateAdvancePayment($id: ID!, $input: UpdateAdvancePaymentInput!) {
    updateAdvancePayment(id: $id, input: $input) {
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
  }
`;

export const DELETE_ADVANCE_PAYMENT = gql`
  mutation DeleteAdvancePayment($id: ID!) {
    deleteAdvancePayment(id: $id)
  }
`;

