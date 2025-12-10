import { gql } from 'graphql.macro';

export default gql`
  mutation ImpersonateUser($email: String!, $targetUserPassword: String!) {
    impersonateUser(email: $email, targetUserPassword: $targetUserPassword) {
      token
      url
    }
  }
`;

