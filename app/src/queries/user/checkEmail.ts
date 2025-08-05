import { gql } from 'graphql.macro';

const checkEmailQuery = gql`
  query IsEmailAlreadyRegistered($email: String!) {
    isEmailAlreadyRegistered(email: $email)
  }
`;

export default checkEmailQuery;
