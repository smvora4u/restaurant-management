import { gql } from '@apollo/client';

export const CREATE_MENU_CATEGORY = gql`
  mutation CreateMenuCategory($input: MenuCategoryInput!) {
    createMenuCategory(input: $input) {
      id
      name
      parentCategoryId
      sortOrder
      isActive
    }
  }
`;

export const UPDATE_MENU_CATEGORY = gql`
  mutation UpdateMenuCategory($id: ID!, $input: UpdateMenuCategoryInput!) {
    updateMenuCategory(id: $id, input: $input) {
      id
      name
      parentCategoryId
      sortOrder
      isActive
    }
  }
`;

export const DELETE_MENU_CATEGORY = gql`
  mutation DeleteMenuCategory($id: ID!) {
    deleteMenuCategory(id: $id)
  }
`;
