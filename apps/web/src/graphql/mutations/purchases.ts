import { gql } from '@apollo/client';

// Category mutations
export const CREATE_PURCHASE_CATEGORY = gql`
  mutation CreatePurchaseCategory($input: PurchaseCategoryInput!) {
    createPurchaseCategory(input: $input) {
      id
      restaurantId
      name
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PURCHASE_CATEGORY = gql`
  mutation UpdatePurchaseCategory($id: ID!, $input: UpdatePurchaseCategoryInput!) {
    updatePurchaseCategory(id: $id, input: $input) {
      id
      restaurantId
      name
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_PURCHASE_CATEGORY = gql`
  mutation DeletePurchaseCategory($id: ID!) {
    deletePurchaseCategory(id: $id)
  }
`;

// Vendor mutations
export const CREATE_VENDOR = gql`
  mutation CreateVendor($input: VendorInput!) {
    createVendor(input: $input) {
      id
      restaurantId
      name
      contactPerson
      phone
      email
      address
      notes
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_VENDOR = gql`
  mutation UpdateVendor($id: ID!, $input: UpdateVendorInput!) {
    updateVendor(id: $id, input: $input) {
      id
      restaurantId
      name
      contactPerson
      phone
      email
      address
      notes
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_VENDOR = gql`
  mutation DeleteVendor($id: ID!) {
    deleteVendor(id: $id)
  }
`;

// Purchase mutations
export const CREATE_PURCHASE = gql`
  mutation CreatePurchase($input: PurchaseInput!) {
    createPurchase(input: $input) {
      id
      restaurantId
      vendorId
      vendor {
        id
        name
      }
      purchaseDate
      items {
        id
        itemName
        quantity
        unit
        unitPrice
        totalPrice
        categoryId
        category {
          id
          name
        }
        notes
      }
      totalAmount
      currency
      paymentStatus
      paymentMethod
      invoiceNumber
      notes
      createdBy
      createdById
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PURCHASE = gql`
  mutation UpdatePurchase($id: ID!, $input: UpdatePurchaseInput!) {
    updatePurchase(id: $id, input: $input) {
      id
      restaurantId
      vendorId
      vendor {
        id
        name
      }
      purchaseDate
      items {
        id
        itemName
        quantity
        unit
        unitPrice
        totalPrice
        categoryId
        category {
          id
          name
        }
        notes
      }
      totalAmount
      currency
      paymentStatus
      paymentMethod
      invoiceNumber
      notes
      createdBy
      createdById
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_PURCHASE = gql`
  mutation DeletePurchase($id: ID!) {
    deletePurchase(id: $id)
  }
`;

export const SETTLE_PURCHASES = gql`
  mutation SettlePurchases($input: PurchaseSettlementInput!) {
    settlePurchases(input: $input) {
      matchedCount
      modifiedCount
    }
  }
`;


