import { gql } from '@apollo/client';

export const GET_MENU_CATEGORIES = gql`
  query GetMenuCategories {
    menuCategories {
      id
      name
      parentCategoryId
      sortOrder
      isActive
    }
  }
`;

export const GET_MENU_CATEGORY_BY_ID = gql`
  query GetMenuCategoryById($id: ID!) {
    menuCategory(id: $id) {
      id
      name
      parentCategoryId
      sortOrder
      isActive
    }
  }
`;
