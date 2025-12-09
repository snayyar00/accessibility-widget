import { gql } from 'graphql.macro';

export default gql`
  mutation ImpersonateUser($email: String!) {
    impersonateUser(email: $email) {
      token
      url
    }
  }
`;

