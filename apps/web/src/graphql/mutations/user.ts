import { gql } from '@apollo/client';

export const CREATE_USER = gql`
  mutation CreateUser($input: UserInput!) {
    createUser(input: $input) {
      id
      name
      mobileNumber
      email
      sessionId
      createdAt
    }
  }
`;
