import { gql } from '@apollo/client';

export const GET_TABLES = gql`
  query GetTables {
    tables {
      id
      number
      capacity
      status
      location
      createdAt
    }
  }
`;

export const GET_TABLE_BY_ID = gql`
  query GetTableById($id: ID!) {
    table(id: $id) {
      id
      number
      capacity
      status
      location
      createdAt
    }
  }
`;
