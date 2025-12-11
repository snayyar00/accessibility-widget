import { gql } from 'graphql.macro';

export default gql`
  mutation Register(
    $email: String!
    $password: String!
    $name: String!
    $referralCode: String
  ) {
    register(
      email: $email
      password: $password
      name: $name
      referralCode: $referralCode
    ) {
      token
      url
    }
  }
`;
