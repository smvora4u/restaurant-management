import { gql } from '@apollo/client';

export const CREATE_STAFF = gql`
  mutation CreateStaff($input: StaffInput!) {
    createStaff(input: $input) {
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

export const UPDATE_STAFF = gql`
  mutation UpdateStaff($id: ID!, $input: UpdateStaffInput!) {
    updateStaff(id: $id, input: $input) {
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

export const DEACTIVATE_STAFF = gql`
  mutation DeactivateStaff($id: ID!) {
    deactivateStaff(id: $id) {
      id
      isActive
    }
  }
`;

export const ACTIVATE_STAFF = gql`
  mutation ActivateStaff($id: ID!) {
    activateStaff(id: $id) {
      id
      isActive
    }
  }
`;

export const UPDATE_ORDER_STATUS_FOR_STAFF = gql`
  mutation UpdateOrderStatusForStaff($id: ID!, $status: String!) {
    updateOrderStatusForStaff(id: $id, status: $status) {
      id
      tableNumber
      orderType
      status
      totalAmount
      customerName
      customerPhone
      notes
      sessionId
      userId
      createdAt
      updatedAt
      items {
        menuItemId
        quantity
        price
        status
        specialInstructions
      }
    }
  }
`;

export const UPDATE_ORDER_ITEM_STATUS_FOR_STAFF = gql`
  mutation UpdateOrderItemStatusForStaff($orderId: ID!, $itemIndex: Int!, $status: String!) {
    updateOrderItemStatusForStaff(orderId: $orderId, itemIndex: $itemIndex, status: $status) {
      id
      tableNumber
      orderType
      status
      totalAmount
      customerName
      customerPhone
      notes
      sessionId
      userId
      createdAt
      updatedAt
      items {
        menuItemId
        quantity
        price
        status
        specialInstructions
      }
    }
  }
`;
