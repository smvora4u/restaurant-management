import { gql } from '@apollo/client';

export const MENU_ITEMS_UPDATED_SUBSCRIPTION = gql`
  subscription MenuItemsUpdated($restaurantId: ID!) {
    menuItemsUpdated(restaurantId: $restaurantId) {
      restaurantId
      updatedAt
    }
  }
`;
