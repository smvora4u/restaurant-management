import { gql } from '@apollo/client';

export const CREATE_TABLE = gql`
  mutation CreateTable($input: TableInput!) {
    createTable(input: $input) {
      id
      number
      capacity
      status
      location
      createdAt
    }
  }
`;

export const UPDATE_TABLE = gql`
  mutation UpdateTable($id: ID!, $input: TableInput!) {
    updateTable(id: $id, input: $input) {
      id
      number
      capacity
      status
      location
      createdAt
    }
  }
`;

export const DELETE_TABLE = gql`
  mutation DeleteTable($id: ID!) {
    deleteTable(id: $id)
  }
`;
