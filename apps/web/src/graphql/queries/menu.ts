import { gql } from '@apollo/client';

export const GET_MENU_ITEMS = gql`
  query GetMenuItems {
    menuItems {
      id
      name
      description
      price
      category
      categoryId
      categoryObj {
        id
        name
        parentCategoryId
      }
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

export const GET_MENU_ITEM_BY_ID = gql`
  query GetMenuItemById($id: ID!) {
    menuItem(id: $id) {
      id
      name
      description
      price
      category
      categoryId
      categoryObj {
        id
        name
        parentCategoryId
      }
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
