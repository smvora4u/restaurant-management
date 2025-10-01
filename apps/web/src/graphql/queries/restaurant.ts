import { gql } from '@apollo/client';

export const GET_ALL_RESTAURANTS = gql`
  query GetAllRestaurants {
    allRestaurants {
      id
      name
      slug
      email
      address
      phone
      settings {
        currency
        timezone
        theme
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_RESTAURANT_BY_ID = gql`
  query GetRestaurantById($id: ID!) {
    restaurantById(id: $id) {
      id
      name
      slug
      email
      address
      phone
      settings {
        currency
        timezone
        theme
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_RESTAURANT_BY_SLUG = gql`
  query GetRestaurantBySlug($slug: String!) {
    restaurantBySlug(slug: $slug) {
      id
      name
      slug
      email
      address
      phone
      settings {
        currency
        timezone
        theme
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_MENU_ITEMS = gql`
  query GetMenuItems {
    menuItems {
      id
      name
      description
      price
      category
      available
      preparationTime
    }
  }
`;

export const GET_ORDERS = gql`
  query GetOrders {
    orders {
      id
      tableNumber
      orderType
      status
      totalAmount
      customerName
      customerPhone
      createdAt
      items {
        menuItemId
        quantity
        price
        status
      }
    }
  }
`;

export const GET_TABLES = gql`
  query GetTables {
    tables {
      id
      number
      capacity
      status
      location
    }
  }
`;