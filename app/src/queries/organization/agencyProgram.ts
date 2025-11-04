import { gql } from '@apollo/client';

export const CONNECT_TO_AGENCY_PROGRAM = gql`
  mutation ConnectToAgencyProgram($successUrl: String!) {
    connectToAgencyProgram(successUrl: $successUrl) {
      onboardingUrl
      success
    }
  }
`;

export const DISCONNECT_FROM_AGENCY_PROGRAM = gql`
  mutation DisconnectFromAgencyProgram {
    disconnectFromAgencyProgram {
      success
      message
    }
  }
`;

export default CONNECT_TO_AGENCY_PROGRAM;
