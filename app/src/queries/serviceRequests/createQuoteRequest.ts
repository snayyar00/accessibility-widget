import { gql } from 'graphql.macro';

export default gql`
  mutation createQuoteRequest($input: CreateQuoteRequestInput!) {
    createQuoteRequest(input: $input) {
      success
      message
    }
  }
`;

