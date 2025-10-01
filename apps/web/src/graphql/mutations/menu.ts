import { gql } from '@apollo/client';

export const CREATE_MENU_ITEM = gql`
  mutation CreateMenuItem($input: MenuItemInput!) {
    createMenuItem(input: $input) {
      id
      name
      description
      price
      category
      available
      imageUrl
      ingredients
      allergens
      preparationTime
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_MENU_ITEM = gql`
  mutation UpdateMenuItem($id: ID!, $input: MenuItemInput!) {
    updateMenuItem(id: $id, input: $input) {
      id
      name
      description
      price
      category
      available
      imageUrl
      ingredients
      allergens
      preparationTime
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_MENU_ITEM = gql`
  mutation DeleteMenuItem($id: ID!) {
    deleteMenuItem(id: $id)
  }
`;
