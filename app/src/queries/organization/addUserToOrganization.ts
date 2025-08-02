import { gql } from 'graphql.macro';

export default gql`
  mutation AddUserToOrganizationByEmail($email: String!) {
    addUserToOrganizationByEmail(email: $email)
  }
`;
