import { gql } from 'graphql.macro';

export default gql`
  mutation createMeetingRequest($input: CreateMeetingRequestInput!) {
    createMeetingRequest(input: $input) {
      success
      message
    }
  }
`;

