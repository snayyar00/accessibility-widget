import { gql } from '@apollo/client';

export const GET_USER_CREDITS = gql`
  query GetUserCredits {
    getUserCredits
  }
`;

export const GET_USER_WITH_CREDITS = gql`
  query GetUserWithCredits {
    profileUser {
      id
      email
      name
      emailCredits
    }
  }
`;