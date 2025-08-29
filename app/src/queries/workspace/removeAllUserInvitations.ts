import { gql } from 'graphql.macro';

export default gql`
  mutation RemoveAllUserInvitations($email: String!) {
    removeAllUserInvitations(email: $email)
  }
`;
