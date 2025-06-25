import { gql } from 'graphql.macro';

export default gql`
  mutation Register(
    $email: String!
    $password: String!
    $name: String!
    $paymentMethodToken: String,
    $planName: String
    $billingType: BillingType
    $organizationName: String
  ) {
    register(
      email: $email
      password: $password
      name: $name
      paymentMethodToken: $paymentMethodToken
      planName: $planName
      billingType: $billingType
      organizationName: $organizationName
    ) {
      token
      url
    }
  }
`;
