import { gql } from '@apollo/client';

export const CREATE_ADMIN = gql`
  mutation CreateAdmin($input: AdminInput!) {
    createAdmin(input: $input) {
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
