import { gql } from '@apollo/client';

export const GET_PURCHASE_CATEGORIES = gql`
  query GetPurchaseCategories($restaurantId: ID!) {
    purchaseCategories(restaurantId: $restaurantId) {
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

export const GET_PURCHASE_CATEGORY = gql`
  query GetPurchaseCategory($id: ID!) {
    purchaseCategory(id: $id) {
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

export const GET_VENDORS = gql`
  query GetVendors($restaurantId: ID!) {
    vendors(restaurantId: $restaurantId) {
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

export const GET_VENDOR = gql`
  query GetVendor($id: ID!) {
    vendor(id: $id) {
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

export const GET_PURCHASES = gql`
  query GetPurchases(
    $restaurantId: ID!
    $limit: Int
    $offset: Int
    $vendorId: ID
    $categoryId: ID
    $paymentStatus: String
    $startDate: String
    $endDate: String
  ) {
    purchases(
      restaurantId: $restaurantId
      limit: $limit
      offset: $offset
      vendorId: $vendorId
      categoryId: $categoryId
      paymentStatus: $paymentStatus
      startDate: $startDate
      endDate: $endDate
    ) {
      data {
        id
        restaurantId
        vendorId
        vendor {
          id
          name
          contactPerson
          phone
          email
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
      totalCount
    }
  }
`;

export const GET_PURCHASE = gql`
  query GetPurchase($id: ID!) {
    purchase(id: $id) {
      id
      restaurantId
      vendorId
      vendor {
        id
        name
        contactPerson
        phone
        email
        address
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
          description
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

